// node tools/sim.js — 戦闘バランスシミュレータ
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ctx = {MON_IMG:{}, console};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'data.js'),'utf8'), ctx);
const {MONSTERS, ITEMS, SPELLS, CLASSES, ENC_TABLES} = vm.runInContext(
  '({MONSTERS, ITEMS, SPELLS, CLASSES, ENC_TABLES})', ctx);

const ri=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
function physDmg(atk, def){
  const base = atk/2 - def/4;
  if(base <= 0.5) return Math.random()<0.5 ? 0 : 1;
  return Math.max(0, Math.round(base * (0.85 + Math.random()*0.3)));
}

function mkMember(id, lv, weapon, armor, shield){
  const g = CLASSES[id].levels[lv];
  const spells = [...CLASSES[id].start];
  for(const [l,sp] of Object.entries(CLASSES[id].learn)) if(+l<=lv) spells.push(sp);
  return {
    id, lv, hp:g.hp, maxhp:g.hp, mp:g.mp, maxmp:g.mp,
    atk: g.str + (weapon?ITEMS[weapon].pow:0),
    def: Math.floor(g.agi/2) + (armor?ITEMS[armor].pow:0) + (shield?ITEMS[shield].pow:0),
    agi: g.agi, spells, atkX:1, asleep:0,
  };
}
function mkFoe(id){
  const m = MONSTERS[id];
  return {key:id, name:m.name, hp:m.hp, maxhp:m.hp, atk:m.atk, def:m.def, agi:m.agi,
    acts:m.acts||[{w:100,t:'atk'}], fireWeak:!!m.fireWeak, iceWeak:!!m.iceWeak,
    boss:!!m.boss, next:m.next, defMul:1, asleep:0, dead:false};
}
function pickW(acts){
  const t = acts.reduce((s,a)=>s+a.w,0);
  let r = Math.random()*t;
  for(const a of acts){ r-=a.w; if(r<0) return a; }
  return acts[0];
}
const aliveP = p=>p.filter(m=>m.hp>0);
const aliveF = f=>f.filter(x=>!x.dead);

function bestSpell(m, types, elemTarget){
  let best = null, bestVal = -1;
  for(const id of m.spells){
    const sp = SPELLS[id];
    if(!types.includes(sp.t) || sp.mp > m.mp) continue;
    let v = (sp.min+sp.max)/2;
    if(elemTarget && sp.elem && ((sp.elem==='fire'&&elemTarget.fireWeak)||(sp.elem==='ice'&&elemTarget.iceWeak))) v*=1.5;
    if(v > bestVal){ bestVal = v; best = {id, sp}; }
  }
  return best;
}

function memberAI(m, party, foes, st){
  const inj = aliveP(party).filter(x=>x.hp < x.maxhp*0.55).sort((a,b)=>a.hp/a.maxhp - b.hp/b.maxhp);
  const dead = party.filter(x=>x.hp<=0);
  if(m.id==='sena'){
    if(dead.length && m.spells.includes('rezarek') && m.mp>=SPELLS.rezarek.mp) return {t:'revive', tgt:dead[0]};
    if(inj.length>=2){
      const h = bestSpell(m, ['healall']);
      if(h) return {t:'healall', id:h.id};
    }
    if(inj.length>=1){
      const h = bestSpell(m, ['heal','fullheal']);
      if(h) return {t:'heal', id:h.id, tgt:inj[0]};
    }
    if(!st.skult2 && m.spells.includes('skult') && m.mp>=4 && foes.some(f=>f.boss)){ st.skult2=(st.skult1?2:1); st.skult1=1; return {t:'defup'}; }
    const d = bestSpell(m, ['dmg'], aliveF(foes)[0]);
    if(d && m.mp > m.maxmp*0.5) return {t:'spell', id:d.id, tgt:aliveF(foes)[0]};
    return {t:'attack', tgt:aliveF(foes)[0]};
  }
  if(m.id==='mira'){
    if(!st.bikilt && m.spells.includes('bikilt') && m.mp>=6 && foes.some(f=>f.boss)){ st.bikilt=1; return {t:'atkup', tgt:party[1]||party[0]}; }
    const tgt = aliveF(foes)[0];
    const multi = aliveF(foes).length>=3 ? bestSpell(m, ['dmgall'], tgt) : null;
    if(multi) return {t:'spellall', id:multi.id};
    const d = bestSpell(m, ['dmg','dmgall'], tgt);
    if(d) return d.sp.t==='dmg' ? {t:'spell', id:d.id, tgt} : {t:'spellall', id:d.id};
    return {t:'attack', tgt};
  }
  if(m.id==='ryuka'){
    const sena = party.find(x=>x.id==='sena' && x.hp>0);
    if(!sena && inj.length){
      const h = bestSpell(m, ['heal']);
      if(h) return {t:'heal', id:h.id, tgt:inj[0]};
    }
    return {t:'attack', tgt:aliveF(foes)[0]};
  }
  return {t:'attack', tgt:aliveF(foes)[0]};
}

function simBattle(partyCfg, group, maxRounds=60){
  const party = partyCfg.map(c=>mkMember(...c));
  const foes = group.map(mkFoe);
  const st = {defX:1};
  let rounds = 0;
  while(rounds++ < maxRounds){
    const acts = [];
    for(const m of aliveP(party)) acts.push({who:'p', m, spd:m.agi*(0.7+Math.random()*0.6)});
    for(const f of aliveF(foes)) acts.push({who:'f', f, spd:f.agi*(0.7+Math.random()*0.6)});
    acts.sort((a,b)=>b.spd-a.spd);
    for(const t of acts){
      if(!aliveP(party).length || !aliveF(foes).length) break;
      if(t.who==='p'){
        const m = t.m;
        if(m.hp<=0) continue;
        if(m.asleep>0){ if(Math.random()<0.5) m.asleep=0; else {m.asleep--; continue;} continue; }
        const a = memberAI(m, party, foes, st);
        if(a.t==='attack'){
          let tgt = a.tgt.dead ? aliveF(foes)[0] : a.tgt;
          if(!tgt) continue;
          let dmg;
          if(Math.random()<1/24) dmg = Math.round(m.atk*m.atkX*(0.75+Math.random()*0.25));
          else if(Math.random()<1/24) dmg = 0;
          else dmg = physDmg(m.atk*m.atkX, tgt.def*tgt.defMul);
          tgt.hp -= dmg;
          if(tgt.hp<=0){
            if(tgt.next){ const nm=MONSTERS[tgt.next]; Object.assign(tgt,{key:tgt.next,hp:nm.hp,maxhp:nm.hp,atk:nm.atk,def:nm.def,agi:nm.agi,acts:nm.acts||[{w:100,t:'atk'}],next:null,defMul:1}); }
            else tgt.dead = true;
          }
        } else if(a.t==='spell'){
          const sp = SPELLS[a.id]; m.mp -= sp.mp;
          let tgt = a.tgt.dead ? aliveF(foes)[0] : a.tgt;
          if(!tgt) continue;
          let dmg = ri(sp.min,sp.max);
          if((sp.elem==='fire'&&tgt.fireWeak)||(sp.elem==='ice'&&tgt.iceWeak)) dmg=Math.round(dmg*1.5);
          tgt.hp -= dmg;
          if(tgt.hp<=0){
            if(tgt.next){ const nm=MONSTERS[tgt.next]; Object.assign(tgt,{key:tgt.next,hp:nm.hp,maxhp:nm.hp,atk:nm.atk,def:nm.def,agi:nm.agi,acts:nm.acts||[{w:100,t:'atk'}],next:null,defMul:1}); }
            else tgt.dead = true;
          }
        } else if(a.t==='spellall'){
          const sp = SPELLS[a.id]; m.mp -= sp.mp;
          for(const f of aliveF(foes)){
            let dmg = ri(sp.min,sp.max);
            if((sp.elem==='fire'&&f.fireWeak)||(sp.elem==='ice'&&f.iceWeak)) dmg=Math.round(dmg*1.5);
            f.hp -= dmg;
            if(f.hp<=0){
              if(f.next){ const nm=MONSTERS[f.next]; Object.assign(f,{key:f.next,hp:nm.hp,maxhp:nm.hp,atk:nm.atk,def:nm.def,agi:nm.agi,acts:nm.acts||[{w:100,t:'atk'}],next:null,defMul:1}); }
              else f.dead = true;
            }
          }
        } else if(a.t==='heal'){
          const sp = SPELLS[a.id]; m.mp -= sp.mp;
          if(sp.t==='fullheal') a.tgt.hp = a.tgt.maxhp;
          else a.tgt.hp = Math.min(a.tgt.maxhp, a.tgt.hp + ri(sp.min,sp.max));
        } else if(a.t==='healall'){
          const sp = SPELLS[a.id]; m.mp -= sp.mp;
          for(const mm of aliveP(party)) mm.hp = Math.min(mm.maxhp, mm.hp + ri(sp.min,sp.max));
        } else if(a.t==='revive'){
          m.mp -= SPELLS.rezarek.mp;
          a.tgt.hp = Math.floor(a.tgt.maxhp/2);
        } else if(a.t==='defup'){
          m.mp -= 4; st.defX = Math.min(1.6, st.defX+0.3);
        } else if(a.t==='atkup'){
          m.mp -= 6; if(a.tgt) a.tgt.atkX = 1.8;
        }
      } else {
        const f = t.f;
        if(f.dead) continue;
        if(f.asleep>0){ if(Math.random()<0.5) f.asleep=0; else {f.asleep--; continue;} continue; }
        const act = pickW(f.acts);
        const pickT = ()=>{
          const ws=[5,4,3,2]; const cs=[];
          party.forEach((m,i)=>{ if(m.hp>0) cs.push({m,w:ws[i]||2}); });
          const tw=cs.reduce((s,c)=>s+c.w,0); let r=Math.random()*tw;
          for(const c of cs){ r-=c.w; if(r<0) return c.m; }
          return cs[0].m;
        };
        const hit=(m,dmg)=>{ m.hp = Math.max(0, m.hp-dmg); };
        if(act.t==='atk'){ const m=pickT(); hit(m, physDmg(f.atk, m.def*st.defX)); }
        else if(act.t==='strong'){ const m=pickT(); hit(m, physDmg(Math.round(f.atk*(act.mul||1.4)), m.def*st.defX)); }
        else if(act.t==='double'){ for(let k=0;k<2;k++){ if(!aliveP(party).length)break; const m=pickT(); hit(m, physDmg(f.atk, m.def*st.defX)); } }
        else if(act.t==='spell'){ const m=pickT(); hit(m, ri(act.min,act.max)); }
        else if(act.t==='breath'){ for(const m of aliveP(party)) hit(m, ri(act.min,act.max)); }
        else if(act.t==='poison'){ const m=pickT(); hit(m, ri(act.min,act.max)); }
        else if(act.t==='sleep'){ for(const m of aliveP(party)){ if(Math.random()<0.45) m.asleep=ri(1,2); } }
      }
    }
    if(!aliveP(party).length) return {win:false, rounds};
    if(!aliveF(foes).length) return {win:true, rounds, survivors:aliveP(party).length,
      hpLeft: aliveP(party).reduce((s,m)=>s+m.hp/m.maxhp,0)/aliveP(party).length};
  }
  return {win:false, rounds, timeout:true};
}

function trial(name, partyCfg, group, n=200){
  let wins=0, rsum=0, surv=0, hp=0, to=0;
  for(let i=0;i<n;i++){
    const r = simBattle(partyCfg, group);
    if(r.win){ wins++; rsum+=r.rounds; surv+=r.survivors; hp+=r.hpLeft; }
    if(r.timeout) to++;
  }
  const wr = (wins/n*100).toFixed(0);
  console.log(`${name.padEnd(34)} 勝率${String(wr).padStart(3)}%  平均${wins?(rsum/wins).toFixed(1):'-'}R  生存${wins?(surv/wins).toFixed(1):'-'}人  残HP${wins?(hp/wins*100).toFixed(0):'-'}%${to?`  ⏱timeout${to}`:''}`);
}

console.log('=== ボス戦シミュレーション（想定レベル・想定装備） ===');
// 1. ゴブリンロード Lv5 二人
trial('1.ゴブリンロード(Lv5x2)', [
  ['ryuka',5,'w_copper','a_leather','s_leather'],
  ['garde',5,'w_copper','a_leather',null],
], ['goblinlord']);
// 2. エルダートレント Lv9 三人
trial('2.エルダートレント(Lv9x3)', [
  ['ryuka',9,'w_iron','a_chain','s_iron'],
  ['garde',9,'w_iron','a_chain',null],
  ['mira',8,'w_silverrod','a_robe',null],
], ['eldertrent']);
// 3. クラーケン Lv11-12 四人
trial('3.クラーケン(Lv12x4)', [
  ['ryuka',12,'w_steel','a_steel','s_iron'],
  ['garde',12,'w_steel','a_steel',null],
  ['mira',11,'w_windrod','a_silkrobe',null],
  ['sena',11,'w_windrod','a_silkrobe',null],
], ['kraken']);
// 4. ファラオ Lv15
trial('4.ファラオ(Lv15x4)', [
  ['ryuka',15,'w_flame','a_flame','s_steel'],
  ['garde',15,'w_axe','a_flame',null],
  ['mira',14,'w_staragi','a_feather',null],
  ['sena',14,'w_staragi','a_feather',null],
], ['pharaoh']);
// 5. イグニス Lv18
trial('5.イグニス(Lv18x4)', [
  ['ryuka',18,'w_flame','a_flame','s_steel'],
  ['garde',18,'w_axe','a_flame',null],
  ['mira',17,'w_staragi','a_feather',null],
  ['sena',17,'w_staragi','a_feather',null],
], ['ignis']);
// 6. レイガ Lv22
trial('6.レイガ(Lv22x4)', [
  ['ryuka',22,'w_dragon','a_dragon','s_magic'],
  ['garde',22,'w_dragon','a_dragon',null],
  ['mira',21,'w_moonrod','a_moonrobe',null],
  ['sena',21,'w_moonrod','a_moonrobe','s_magic'],
], ['reiga']);
// 7. ザガン Lv25
trial('7.ザガン(Lv25x4)', [
  ['ryuka',25,'w_dragon','a_dragon','s_dragon'],
  ['garde',25,'w_greataxe','a_dragon',null],
  ['mira',24,'w_moonrod','a_moonrobe',null],
  ['sena',24,'w_moonrod','a_moonrobe','s_magic'],
], ['darkgeneral']);
// 8. ノワール Lv27（城ドロップ装備込み）
trial('8.ノワール(Lv27x4)', [
  ['ryuka',27,'w_dragon','a_dragon','s_dragon'],
  ['garde',27,'w_ruin','a_dark',null],
  ['mira',26,'w_sage','a_moonrobe',null],
  ['sena',26,'w_moonrod','a_moonrobe','s_magic'],
], ['noir']);
// 8b. ノワール Lv28 祭壇装備込み
trial('8b.ノワール(Lv28+祭壇装備)', [
  ['ryuka',28,'w_hero','a_light','s_light'],
  ['garde',28,'w_ruin','a_dark',null],
  ['mira',27,'w_sage','a_moonrobe',null],
  ['sena',27,'w_moonrod','a_moonrobe','s_magic'],
], ['noir']);
console.log('--- 記憶の祭壇（やりこみ） ---');
trial('M1.ガイアワーム(Lv24x4)', [
  ['ryuka',24,'w_dragon','a_dragon','s_dragon'],
  ['garde',24,'w_greataxe','a_dragon',null],
  ['mira',23,'w_moonrod','a_moonrobe',null],
  ['sena',23,'w_moonrod','a_moonrobe','s_magic'],
], ['m_gaiaworm']);
trial('M4.ザルバ(Lv28x4)', [
  ['ryuka',28,'w_dragon','a_light','s_light'],
  ['garde',28,'w_ruin','a_dark',null],
  ['mira',27,'w_sage','a_moonrobe',null],
  ['sena',27,'w_moonrod','a_moonrobe','s_magic'],
], ['m_zarba']);

console.log('=== ザコ戦サンプル ===');
trial('草原 slime x2 (Lv1x2 初期)', [['ryuka',1,null,null,null],['garde',1,'w_stick',null,null]], ['slime','slime']);
trial('草原 bee (Lv1x2 初期)', [['ryuka',1,null,null,null],['garde',1,'w_stick',null,null]], ['bee']);
trial('草原 goblin (Lv2x2)', [['ryuka',2,'w_stick','a_cloth',null],['garde',2,'w_stick',null,null]], ['goblin']);
trial('洞窟 skeleton+worm (Lv4x2)', [
  ['ryuka',4,'w_copper','a_leather','s_leather'],['garde',4,'w_copper','a_leather',null]], ['skeleton','worm']);
trial('海 serpent+merman (Lv12x4)', [
  ['ryuka',12,'w_steel','a_steel','s_iron'],['garde',12,'w_steel','a_steel',null],
  ['mira',11,'w_windrod','a_silkrobe',null],['sena',11,'w_windrod','a_silkrobe',null]], ['seaserpent','merman']);
trial('城 hh+hh+arch (Lv26x4)', [
  ['ryuka',26,'w_dragon','a_dragon','s_dragon'],['garde',26,'w_greataxe','a_dragon',null],
  ['mira',25,'w_moonrod','a_moonrobe',null],['sena',25,'w_moonrod','a_moonrobe','s_magic']],
  ['hellhound','hellhound','archdemon']);
