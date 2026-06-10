// ============================================================
// game.js — エンジン本体（フィールド・UI・メニュー・イベント）
// ヒカリの伝説II 〜よみがえる闇〜
// ============================================================
'use strict';

const TS = 32, VW = 22, VH = 14, W = VW*TS, H = VH*TS;
const SAVE_KEY = 'hikari_quest2_save_v1';

let cv, ctx;
let scene = 'title';          // title | story | field | battle | ending
let G = null;                 // ゲーム状態（party配列を含む）
let curMap = 'world';
let hero = {x:0,y:0,px:0,py:0,tx:0,ty:0,dir:'down',moving:false};
let trail = [];               // 隊列の足跡 [{x,y,dir},...] 先頭=勇者の現在地
let npcRT = [];
let keysDown = {};
let keyWaiters = [];
let frame = 0;
let msgState = null;
let menuStack = [];
let eventLock = false;
let encGrace = 0;
let gateCd = 0;
let mapBanner = 0;
let fadeT = 0;
let poisonFlash = 0;
let toast = null;
let playStart = Date.now();
let endResolver = null;

// ---------------- ユーティリティ ----------------
function ri(a,b){ return a + Math.floor(Math.random()*(b-a+1)); }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function pickWeighted(acts){
  const total = acts.reduce((s,a)=>s+a.w,0);
  let r = Math.random()*total;
  for(const a of acts){ r -= a.w; if(r<0) return a; }
  return acts[0];
}
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function fmtTime(ms){
  const s = Math.floor(ms/1000);
  const h = Math.floor(s/3600), m = Math.floor(s%3600/60), ss = s%60;
  return `${h}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}

// ---------------- パーティ・派生ステータス ----------------
function mGrowth(m){ return CLASSES[m.id].levels[m.lv]; }
function mMaxHp(m){ return mGrowth(m).hp; }
function mMaxMp(m){ return mGrowth(m).mp; }
function mStr(m){ return mGrowth(m).str + (m.strB||0); }
function mAgi(m){ return mGrowth(m).agi + (m.agiB||0); }
function mAtk(m){ return mStr(m) + (m.weapon ? ITEMS[m.weapon].pow : 0); }
function mDef(m){
  return Math.floor(mAgi(m)/2) + (m.defB||0)
    + (m.armor ? ITEMS[m.armor].pow : 0)
    + (m.shield ? ITEMS[m.shield].pow : 0);
}
function aliveParty(){ return G.party.filter(m=>m.hp>0); }
function partyLeader(){ return aliveParty()[0] || G.party[0]; }
function shards(){ return ['s1','s2','s3','s4','s5'].filter(f=>G.flags[f]).length; }
function canEquip(m, itemId){
  const it = ITEMS[itemId];
  return !it.eq || it.eq.includes(m.id);
}
function makeMember(id, lv){
  const c = CLASSES[id];
  const m = {
    id, name: c.defName, lv, exp: EXP_TABLE[lv],
    hp:0, mp:0, strB:0, defB:0, agiB:0,
    weapon:null, armor:null, shield:null,
    spells: [...c.start], poison:false,
  };
  for(const [l,sp] of Object.entries(c.learn)){
    if(+l <= lv && !m.spells.includes(sp)) m.spells.push(sp);
  }
  m.hp = mMaxHp(m); m.mp = mMaxMp(m);
  return m;
}
function joinMember(id, baseLv){
  const lv = Math.max(baseLv, G.party[0].lv - 1);
  const m = makeMember(id, lv);
  if(id==='mira'){ m.weapon='w_oakrod'; m.armor='a_cloth'; }
  if(id==='sena'){ m.weapon='w_oakrod'; m.armor='a_cloth'; }
  if(id==='garde'){ m.weapon='w_stick'; }
  G.party.push(m);
  return m;
}

// ---------------- インベントリ ----------------
function addItem(id, n=1){
  const e = G.inv.find(i=>i.id===id);
  if(e) e.n += n; else G.inv.push({id, n});
}
function removeItem(id, n=1){
  const i = G.inv.findIndex(e=>e.id===id);
  if(i<0) return;
  G.inv[i].n -= n;
  if(G.inv[i].n<=0) G.inv.splice(i,1);
}

// ---------------- 入力 ----------------
const KEYMAP = {
  ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right',
  w:'up', s:'down', a:'left', d:'right', W:'up', S:'down', A:'left', D:'right',
  z:'ok', Z:'ok', Enter:'ok', ' ':'ok',
  x:'cancel', X:'cancel', Escape:'cancel', Backspace:'cancel',
};

function initInput(){
  window.addEventListener('keydown', e=>{
    ensureAudio();
    if(e.key==='m' || e.key==='M'){
      const on = toggleSound();
      toast = {text: on ? '♪ サウンド ON' : '♪ サウンド OFF', t:80};
      return;
    }
    if(e.key==='Shift'){ keysDown.shift = true; return; }
    const k = KEYMAP[e.key];
    if(!k) return;
    e.preventDefault();
    keysDown[k] = true;
    for(let i=0;i<keyWaiters.length;i++){
      if(keyWaiters[i].accept.includes(k)){
        const wtr = keyWaiters.splice(i,1)[0];
        wtr.res(k);
        return;
      }
    }
    if(scene==='field' && !eventLock && !msgState && menuStack.length===0 && !hero.moving){
      if(k==='ok') interact();
      else if(k==='cancel') openFieldMenu();
    }
  });
  window.addEventListener('keyup', e=>{
    if(e.key==='Shift'){ keysDown.shift = false; return; }
    const k = KEYMAP[e.key];
    if(k) keysDown[k] = false;
  });
}

function waitKey(accept=['ok','cancel','up','down','left','right']){
  return new Promise(res=>keyWaiters.push({accept, res}));
}

// ---------------- メッセージ ----------------
async function msg(...args){
  const flat = args.flat().filter(l=>l!==undefined && l!==null);
  for(let i=0;i<flat.length;i+=3){
    const lines = flat.slice(i, i+3);
    msgState = {lines, shown:0, total: lines.join('').length};
    for(;;){
      const k = await waitKey(['ok','cancel']);
      if(msgState.shown < msgState.total){ msgState.shown = msgState.total; }
      else { SFX.cursor(); break; }
    }
  }
  msgState = null;
}

// ---------------- メニュー ----------------
async function choiceMenu(items, opts={}){
  const list = items.map(it=> typeof it==='string' ? {label:it} : it);
  const m = {
    items: list, cursor: opts.cursor||0, scroll: 0,
    x: opts.x!==undefined ? opts.x : 240,
    y: opts.y!==undefined ? opts.y : 96,
    w: opts.w || Math.max(...list.map(i=>(i.label.length+(i.right?i.right.length:0))*19+76), 140),
    view: opts.view || Math.min(list.length, 9),
    title: opts.title || null,
  };
  menuStack.push(m);
  try{
    for(;;){
      const k = await waitKey(['up','down','ok','cancel']);
      if(k==='up'){ m.cursor = (m.cursor + list.length - 1) % list.length; SFX.cursor(); }
      else if(k==='down'){ m.cursor = (m.cursor + 1) % list.length; SFX.cursor(); }
      else if(k==='ok'){ SFX.ok(); return m.cursor; }
      else if(k==='cancel'){
        if(opts.cancelable===false) continue;
        SFX.cancel(); return -1;
      }
      if(m.cursor < m.scroll) m.scroll = m.cursor;
      if(m.cursor >= m.scroll + m.view) m.scroll = m.cursor - m.view + 1;
    }
  } finally {
    menuStack.pop();
  }
}

async function yesno(question, opts={}){
  if(question) await msgPrompt(question);
  const i = await choiceMenu(['はい','いいえ'], {x:opts.x||500, y:opts.y||170, w:130, ...opts});
  msgState = null;
  return i===0;
}
async function msgPrompt(...args){
  const flat = args.flat();
  msgState = {lines:flat, shown:flat.join('').length, total:flat.join('').length};
}

// メンバー選択メニュー。filter(m)=>bool 省略で全員。 戻り値: member か null
async function chooseMember(title, filter, opts={}){
  const cands = G.party.filter(filter || (()=>true));
  if(cands.length===0) return null;
  if(cands.length===1 && opts.autoSingle) return cands[0];
  const items = cands.map(m=>({label:m.name, right: opts.right ? opts.right(m) : `HP${m.hp}`}));
  const i = await choiceMenu(items, {x:opts.x||380, y:opts.y||130, title, w:opts.w||260});
  if(i<0) return null;
  return cands[i];
}

// ---------------- マップアクセス ----------------
function getTile(mapId, x, y){
  const m = MAPS[mapId];
  if(y<0 || y>=m.tiles.length) return m.pad || '~';
  const row = m.tiles[y];
  if(x<0 || x>=row.length) return m.pad || '~';
  return row[x];
}
function inBounds(mapId, x, y){
  const m = MAPS[mapId];
  return y>=0 && y<m.tiles.length && x>=0 && x<m.tiles[0].length;
}
function npcAt(x, y){
  return npcRT.find(n=>n.x===x && n.y===y);
}
function objAt(mapId, x, y){
  const m = MAPS[mapId];
  return (m.objects||[]).find(o=>{
    if(o.x!==x || o.y!==y) return false;
    if(o.type==='chest') return !G.chests[o.id];
    if(o.type==='boss') return !G.flags[o.flag];
    return false;
  });
}
function ahead(x, y, dir){
  if(dir==='up') return [x, y-1];
  if(dir==='down') return [x, y+1];
  if(dir==='left') return [x-1, y];
  return [x+1, y];
}

function passable(x, y){
  if(!inBounds(curMap, x, y)) return false;
  const t = getTile(curMap, x, y);
  if(t==='g'){
    if(!G.flags.gate){
      if(gateCd===0 && !eventLock) gateEvent();
      return false;
    }
  } else if(t==='~'){
    if(!(MAPS[curMap].world && G.flags.ship)) return false;
  } else if(!WALKABLE.has(t)) return false;
  if(npcAt(x,y)) return false;
  if(objAt(curMap,x,y)) return false;
  return true;
}

// ---------------- マップ遷移 ----------------
function enterMap(id, x, y){
  curMap = id;
  const m = MAPS[id];
  hero.x = x; hero.y = y;
  hero.px = x*TS; hero.py = y*TS;
  hero.moving = false;
  G.map = id; G.x = x; G.y = y;
  trail = [{x,y,dir:'down'},{x,y,dir:'down'},{x,y,dir:'down'},{x,y,dir:'down'}];
  refreshNpcs();
  if(m.town) G.lastTown = id;
  playBgm(id==='world' && getTile('world',x,y)==='~' ? 'sea' : m.bgm);
  mapBanner = 110;
  encGrace = 5;
}
function refreshNpcs(){
  const m = MAPS[curMap];
  npcRT = (m.npcs||[])
    .filter(n=>!(n.unless && G.flags[n.unless]))
    .filter(n=>!(n.requires && !G.flags[n.requires]))
    .map(n=>({...n, hx:n.x, hy:n.y, t:ri(60,180)}));
}

// ---------------- フィールド更新 ----------------
function canMoveNow(){
  return scene==='field' && !msgState && menuStack.length===0 && !eventLock;
}

function updateField(){
  if(gateCd>0) gateCd--;
  if(hero.moving){
    const sp = keysDown.shift ? 8 : 4;
    const txp = hero.tx*TS, typ = hero.ty*TS;
    hero.px += Math.sign(txp-hero.px) * Math.min(sp, Math.abs(txp-hero.px));
    hero.py += Math.sign(typ-hero.py) * Math.min(sp, Math.abs(typ-hero.py));
    if(hero.px===txp && hero.py===typ){
      hero.moving = false;
      hero.x = hero.tx; hero.y = hero.ty;
      G.x = hero.x; G.y = hero.y;
      trail.unshift({x:hero.x, y:hero.y, dir:hero.dir});
      if(trail.length>8) trail.pop();
      onStep();
    }
  } else if(canMoveNow()){
    let d = null;
    if(keysDown.up) d='up';
    else if(keysDown.down) d='down';
    else if(keysDown.left) d='left';
    else if(keysDown.right) d='right';
    if(d){
      hero.dir = d;
      const [nx,ny] = ahead(hero.x, hero.y, d);
      if(passable(nx,ny)){ hero.moving = true; hero.tx = nx; hero.ty = ny; }
    }
  }
  // NPC徘徊
  if(canMoveNow()){
    for(const n of npcRT){
      if(!n.wander) continue;
      if(--n.t > 0) continue;
      n.t = ri(60, 200);
      const d = pick(['up','down','left','right']);
      const [nx,ny] = ahead(n.x, n.y, d);
      if(Math.abs(nx-n.hx)>2 || Math.abs(ny-n.hy)>2) continue;
      if(!WANDER_OK.has(getTile(curMap, nx, ny))) continue;
      if(nx===hero.x && ny===hero.y) continue;
      if(npcAt(nx,ny)) continue;
      n.x = nx; n.y = ny;
    }
  }
}

function onStep(){
  const t = getTile(curMap, hero.x, hero.y);
  const m = MAPS[curMap];
  // 毒ダメージ（歩くたびHP-1、HP1で止まる）
  let poisoned = false;
  for(const mem of G.party){
    if(mem.poison && mem.hp>1){ mem.hp--; poisoned = true; }
  }
  if(poisoned) poisonFlash = 8;
  if(t==='>'){
    enterMap('world', m.exitTo.x, m.exitTo.y);
    return;
  }
  if(m.world && ENTRANCES[t]){
    const id = ENTRANCES[t];
    enterMap(id, MAPS[id].entry.x, MAPS[id].entry.y);
    return;
  }
  // 海⇔陸でBGM切り替え
  if(m.world){
    const want = (t==='~') ? 'sea' : 'field';
    if(curBgmName!==want) playBgm(want);
  }
  rollEncounter(t);
}

function encInfoFor(t, x, y){
  for(const rule of WORLD_ENC){
    if(!rule.t.includes(t)) continue;
    if(rule.zone){
      const [x1,y1,x2,y2] = rule.zone;
      if(x<x1 || x>x2 || y<y1 || y>y2) continue;
    }
    if(!rule.table) return null;
    return {table:rule.table, rate: ENC_RATE[t] || 14};
  }
  return null;
}

function rollEncounter(t){
  if(eventLock) return;
  if(encGrace>0){ encGrace--; return; }
  let info = null;
  const m = MAPS[curMap];
  if(m.world){
    info = encInfoFor(t, hero.x, hero.y);
  } else if(m.enc && t==='-'){
    info = {table:m.enc.table, rate:m.enc.rate};
  }
  if(!info) return;
  if(Math.random()*info.rate < 1) doEncounter(info.table);
}

async function doEncounter(table){
  eventLock = true;
  const group = pick(ENC_TABLES[table]);
  const r = await runBattle(group, {});
  encGrace = 7;
  if(r==='dead') await handleDeath();
  eventLock = false;
}

// ---------------- しらべる / 会話 ----------------
async function interact(){
  const [fx,fy] = ahead(hero.x, hero.y, hero.dir);
  const npc = npcAt(fx,fy);
  if(npc) return npcTalk(npc);
  const obj = objAt(curMap, fx, fy);
  if(obj) return objInteract(obj);
}

async function npcTalk(npc){
  eventLock = true;
  try{
    if(npc.inn !== undefined) await innFlow(npc);
    else if(npc.shop) await shopFlow(npc.shop);
    else if(npc.church) await churchFlow();
    else if(npc.event) await EVENTS[npc.event]();
    else if(npc.msg) await msg(npc.msg);
  } finally { eventLock = false; }
}

async function innFlow(npc){
  const ok = await yesno([`「やどに とまるかい？ ひとばん ${npc.inn}ゴールドだよ。」`]);
  if(!ok){ await msg('「また おいでね。」'); return; }
  if(G.gold < npc.inn){ await msg('「おや、ゴールドが たりないようだね…」'); return; }
  G.gold -= npc.inn;
  fadeT = 80;
  SFX.inn();
  await sleep(1400);
  for(const m of G.party){
    if(m.hp>0){ m.hp = mMaxHp(m); m.mp = mMaxMp(m); }
  }
  const deadOnes = G.party.filter(m=>m.hp<=0);
  await msg('「おはよう！ よく ねむれたかい？」','みんなの HPとMPが かんぜんに かいふくした！');
  if(deadOnes.length>0)
    await msg('（ちからつきた なかまは やどでは もどらない…','　きょうかいで いきかえらせて もらおう）');
}

// ---------------- 教会 ----------------
async function churchFlow(){
  await msg('「ようこそ ひかりの きょうかいへ。」');
  for(;;){
    const sel = await choiceMenu(['いきかえらせる','どくをちりょう','やめる'], {x:60, y:120, title:'きょうかい'});
    if(sel===0){
      const dead = G.party.filter(m=>m.hp<=0);
      if(dead.length===0){ await msg('「ちからつきた かたは いないようですね。」'); continue; }
      const m = await chooseMember('だれを？', mm=>mm.hp<=0, {right:m=>`${m.lv*15}G`});
      if(!m) continue;
      const cost = m.lv*15;
      if(G.gold < cost){ await msg(`「おきよめには ${cost}ゴールド ひつようです…」`); continue; }
      G.gold -= cost;
      SFX.revive();
      m.hp = mMaxHp(m);
      await msg(`いのりが ささげられた──`, `${m.name}は いきかえった！`);
    } else if(sel===1){
      const sick = G.party.filter(m=>m.poison);
      if(sick.length===0){ await msg('「どくに おかされた かたは いないようですね。」'); continue; }
      const m = await chooseMember('だれを？', mm=>mm.poison, {right:()=>'20G'});
      if(!m) continue;
      if(G.gold < 20){ await msg('「ちりょうには 20ゴールド ひつようです…」'); continue; }
      G.gold -= 20;
      SFX.heal();
      m.poison = false;
      await msg(`${m.name}の どくは きれいに きえさった！`);
    } else break;
  }
  await msg('「あなたがたに ひかりの ごかごが ありますように。」');
}

// ---------------- イベント ----------------
const EVENTS = {
  async elder(){
    if(!G.flags.q0){
      await msg(`「おお ${G.party[0].name}、 きたか。」`,
        '「ゆうべ そらから せいなる星が くだけおちるのを みた…」',
        '「あれは 10ねんまえ ゆうしゃユウさまが のこした まもりの星じゃ。」');
      await msg('「星が くだけたいま、 やみの けはいが もどりつつある。」',
        '「王都グランディアの おうさまに この ことを しらせてくれ。」',
        '「きたの とうげを こえた さきじゃ。」');
      SFX.gold();
      G.gold += 100; addItem('herb', 3);
      await msg('たびのしたくにと 100ゴールドと やくそう3つを さずかった！',
        '「みせで そうびを ととのえるのじゃぞ！」');
      G.flags.q0 = 1;
    } else if(shards()>=5){
      await msg('「5つの かけらが そろったか…！」',
        '「きたのうみの くらき しまへ ゆけ。」',
        '「せかいの うんめいは おぬしらに たくされた！」');
    } else {
      await msg('「王都の おうさまが まっておるぞ。」',
        '「きたの とうげを こえるのじゃ。」');
    }
  },
  async king(){
    if(!G.flags.q_king){
      await msg('「おお、 リオンむらの わかものか。 よくぞ まいった。」',
        '「せいなる星の ことは すでに みみに とどいておる。」');
      await msg('「くだけた 星は 5つの《ほしのかけら》となり','せかいの あちこちに とびちった。」',
        '「やみに そまる まえに あつめねば ならぬ。」');
      await msg('「かけらの ありかは──」',
        '「ひがしの洞窟、 きたのもりの遺跡、 さばくのピラミッド、」',
        '「かざんのおく、 そして こおりのしんでん じゃ。」');
      await msg('「みなとの ふねを つかうがよい。 しょじょうを さずけよう。」',
        '「それと わが くにの てんさいまほうつかい ミラを つれてゆけ。」');
      SFX.gold();
      G.gold += 300;
      G.flags.q_king = 1;
      await msg('おうさまから 300ゴールドと しょじょうを さずかった！');
    } else if(G.flags.clear!==undefined && G.flags.clear){
      await msg('「ゆうしゃたちよ！ せかいを すくってくれて ありがとう！」');
    } else if(shards()>=5){
      await msg('「5つの かけらが そろったのだな…！」',
        '「きたのうみの しまに ノワールの けっかいが ある。」',
        '「かけらの ひかりが みちを ひらくであろう！」');
    } else {
      await msg(`「かけらは いま ${shards()}つ。 のこり ${5-shards()}つじゃ。」`,
        '「ふねは マリナの みなとに ある。 たのんだぞ。」');
    }
  },
  async mira(){
    if(G.flags.j_mira){ await msg('「さあ、 いきましょ！」'); return; }
    if(!G.flags.q_king){
      await msg('「わたしは きゅうてい まほうつかいの ミラ。」',
        '「まずは おうさまの おはなしを きいて ちょうだい。」');
      return;
    }
    await msg('「おうさまの めいれいなら しかたないわね。」',
      '「── なんてね。 ホントは うずうずしてたの！」',
      '「せかいを すくう だいぼうけん、 いきましょ！」');
    SFX.join();
    joinMember('mira', 5);
    G.flags.j_mira = 1;
    refreshNpcs();
    await msg('まほうつかい ミラが なかまに くわわった！');
  },
  async sena(){
    if(G.flags.j_sena){ await msg('「みなさんと いっしょなら こころづよいです。」'); return; }
    await msg('「たびのかた… この まちの うみに かいまが すみつき」',
      '「ふなびとたちが くるしんで います。」');
    await msg('「わたしは きょうかいの セナと もうします。」',
      '「いやしの ちからが おやくに たてるはず。」',
      '「どうか ごいっしょ させてください！」');
    SFX.join();
    joinMember('sena', 8);
    G.flags.j_sena = 1;
    refreshNpcs();
    await msg('そうりょ セナが なかまに くわわった！');
  },
  async harbor(){
    if(!G.flags.q_king){
      await msg('「ここは みなとだが… ふねは かしだせん。」',
        '「おうさまの しょじょうでも あれば べつだがな。」');
    } else if(!G.flags.kraken){
      await msg('「なに、 おうさまの しょじょうだと！？」',
        '「ふねを かしてやりたいのは やまやまだが…」',
        '「みなとに ばけものダコ クラーケンが いすわっておるのだ。」');
      const go = await yesno(['「やつを たいじしてくれたら ふねは おまえさんたちのものだ。」','「どうだ、 やってくれるか？」']);
      if(!go){ await msg('「まあ むりは いわんさ…」'); return; }
      await msg('そのとき── みなとの うみが さかまいた！！');
      const r = await runBattle(['kraken'], {boss:true});
      if(r==='dead'){ await handleDeath(); return; }
      if(r!=='win') return;
      G.flags.kraken = 1;
      G.flags.ship = 1;
      SFX.ship();
      await msg('「やりおった！ クラーケンを たおしおった！」',
        '「やくそくどおり ふねは おまえさんたちのものだ！」');
      await msg('ふねを てにいれた！',
        'ワールドマップで うみに むかって あるくと のりこめるぞ。',
        'ななつのうみが きみたちを まっている！');
    } else {
      await msg('「クラーケンを たおすとは たいしたもんだ！」',
        '「ななつのうみは おまえさんたちの ものだぜ！」');
    }
  },
  async elfelder(){
    if(!G.flags.clear){
      await msg('「ようこそ にんげんの こよ。 よくぞ この さとを みつけた。」',
        '「しんまおう ノワールは ザルバの やみの ざんしから うまれた。」');
      await msg('「にしのうみの ちいさな しまに 《きおくの祭壇》が ある。」',
        '「そこには ゆうしゃユウどのの たたかいの きおくが ねむる。」',
        '「しれんを こえれば つよき ちからを えられよう。」');
    } else {
      await msg('「やみは はらわれた。 もりも よろこんで おるわ。」');
    }
  },
  async yu(){
    if(!G.flags.m4){
      await msg('「ようこそ、 あたらしき ゆうしゃたちよ。」',
        '「わしは ユウ。 …の きおくが のこした まぼろしじゃ。」');
      await msg('「ここには わしが たおした つわものどもの きおくが ねむる。」',
        '「いしぶみに ふれれば たたかいの きおくが よみがえる。」',
        '「しれんを こえし ものには ほうびを さずけよう。」');
      if(G.flags.m1 && G.flags.m2 && G.flags.m3){
        await msg('「3つの きおくを こえたか… みごとじゃ。」',
          '「さいごは わしの しゅくてき── ザルバの きおく。」',
          '「こころして いどむが よい。」');
      }
    } else {
      await msg('「ザルバの きおくをも こえるとは… あっぱれじゃ！」',
        '「わしの けんと よろいは おぬしらの ものじゃ。」',
        '「ゆけ！ ノワールを たおし せかいに ひかりを とりもどせ！」');
    }
  },
};

// ---------------- オブジェクト ----------------
async function objInteract(obj){
  eventLock = true;
  try{
    if(obj.type==='chest'){
      SFX.chest();
      G.chests[obj.id] = 1;
      if(obj.gold){
        G.gold += obj.gold;
        await msg(`たからばこを あけた！`, `${obj.gold}ゴールドを てにいれた！`);
      } else {
        addItem(obj.item);
        await msg(`たからばこを あけた！`, `${ITEMS[obj.item].name}を てにいれた！`);
      }
    } else if(obj.type==='boss'){
      if(obj.requires && obj.requires.some(f=>!G.flags[f])){
        await msg(obj.lockMsg || ['なにかの ちからで ふうじられている…']);
        return;
      }
      if(obj.pre) await msg(obj.pre);
      else await msg(`${MONSTERS[obj.monster].name}が ゆくてを ふさいでいる！`);
      const go = await yesno(['たたかいますか？']);
      if(!go) return;
      const r = await runBattle([obj.monster], {boss:true});
      if(r==='dead'){ await handleDeath(); return; }
      if(r!=='win') return;
      G.flags[obj.flag] = 1;
      if(obj.shard){
        SFX.crystal();
        const c = shards();
        await msg(`✨ ほしのかけらを てにいれた！ ✨`,
          c>=5 ? '5つの かけらが すべて そろった！ きたのうみの しまへ いそげ！'
               : `あつめた かけら: ${c} / 5`);
      }
      if(obj.reward){
        SFX.chest();
        addItem(obj.reward.item, obj.reward.n||1);
        await msg(`ほうびに ${ITEMS[obj.reward.item].name}${obj.reward.n>1?` ${obj.reward.n}こ`:''}を さずかった！`);
      }
      if(obj.win) await msg(obj.win);
      if(obj.memory && G.flags.m1 && G.flags.m2 && G.flags.m3 && G.flags.m4){
        await msg('すべての きおくの しれんを のりこえた！',
          'まぼろしの ユウに はなしかけてみよう。');
      }
      if(obj.final) await endingSeq();
    }
  } finally { eventLock = false; }
}

async function gateEvent(){
  eventLock = true; gateCd = 45;
  try{
    if(shards()>=5){
      SFX.crystal();
      await msg('かかげた 5つの ほしのかけらが まばゆく かがやきだした！');
      SFX.gate();
      G.flags.gate = 1;
      await msg('やみの けっかいが おとを たてて くずれていく……！');
    } else {
      await msg('しまは やみの けっかいに おおわれている。',
        `けっかいを やぶるには ほしのかけらが 5つ ひつようだ。（いま ${shards()}こ）`);
    }
  } finally { eventLock = false; }
}

// ---------------- 店 ----------------
async function shopFlow(shopId){
  const stock = SHOPS[shopId];
  await msg('「いらっしゃい！ なにを おもとめだい？」');
  for(;;){
    const sel = await choiceMenu(['かう','うる','やめる'], {x:60, y:120, title:'おみせ'});
    if(sel===0){ await buyFlow(stock); }
    else if(sel===1){ await sellFlow(); }
    else break;
  }
  await msg('「まいど あり！ また きてくれよな！」');
}

async function buyFlow(stock){
  for(;;){
    const items = stock.map(id=>({label:ITEMS[id].name, right:`${ITEMS[id].price}G`}));
    const i = await choiceMenu(items, {x:60, y:120, title:`もちがね ${G.gold}G`});
    if(i<0) return;
    const id = stock[i];
    const it = ITEMS[id];
    if(G.gold < it.price){ await msg('「ゴールドが たりないみたいだぜ。」'); continue; }
    const ok = await yesno([`${it.name}を ${it.price}ゴールドで かいますか？`]);
    if(!ok) continue;
    G.gold -= it.price;
    SFX.gold();
    addItem(id);
    if(it.type==='tool'){
      await msg(`${it.name}を かった！`);
    } else {
      const eq = await yesno([`${it.name}を かった！ すぐに そうびしますか？`]);
      if(eq) await equipFromBag(id);
    }
  }
}

async function sellFlow(){
  for(;;){
    const sellable = G.inv.filter(e=>ITEMS[e.id].price>0);
    if(sellable.length===0){ await msg('「うれる ものは ないみたいだな。」'); return; }
    const items = sellable.map(e=>({label:`${ITEMS[e.id].name}${e.n>1?' x'+e.n:''}`, right:`${Math.floor(ITEMS[e.id].price/2)}G`}));
    const i = await choiceMenu(items, {x:60, y:120, title:'どれを うる？'});
    if(i<0) return;
    const id = sellable[i].id;
    const price = Math.floor(ITEMS[id].price/2);
    const ok = await yesno([`${ITEMS[id].name}を ${price}ゴールドで うりますか？`]);
    if(!ok) continue;
    removeItem(id);
    G.gold += price;
    SFX.gold();
    await msg(`${ITEMS[id].name}を うった！`);
  }
}

// 袋の中の装備品を誰かに装備させる
async function equipFromBag(id){
  const it = ITEMS[id];
  const slot = it.type==='weapon' ? 'weapon' : it.type==='armor' ? 'armor' : 'shield';
  const m = await chooseMember('だれが そうびする？', mm=>canEquip(mm,id), {
    right: mm=>{
      const cur = mm[slot];
      const diff = it.pow - (cur ? ITEMS[cur].pow : 0);
      return `${diff>=0?'+':''}${diff}`;
    }, w:300,
  });
  if(!m){ await msg('（だれも そうびできない… ふくろに しまった）'); return; }
  const old = m[slot];
  m[slot] = id;
  removeItem(id);
  if(old) addItem(old);
  SFX.ok();
  await msg(`${m.name}は ${it.name}を そうびした！`);
}

// ---------------- フィールドメニュー ----------------
async function openFieldMenu(){
  eventLock = true;
  try{
    SFX.ok();
    for(;;){
      const sel = await choiceMenu(['じゅもん','どうぐ','そうび','つよさ','セーブ'], {x:24, y:130, title:'メニュー', w:180});
      if(sel<0) break;
      if(sel===0){ if(await spellMenuField()) break; }
      else if(sel===1){ if(await itemMenuField()) break; }
      else if(sel===2) await equipMenu();
      else if(sel===3) await statsFlow();
      else if(sel===4) await doSave();
    }
  } finally { eventLock = false; }
}

async function spellMenuField(){
  for(;;){
    const caster = await chooseMember('だれの じゅもん？', m=>m.hp>0 && m.spells.length>0, {x:210, y:130, right:m=>`MP${m.mp}`});
    if(!caster){
      if(G.party.every(m=>m.spells.length===0)) await msg('まだ だれも じゅもんを おぼえていない。');
      return false;
    }
    for(;;){
      const items = caster.spells.map(id=>({label:SPELLS[id].name, right:`MP${SPELLS[id].mp}`}));
      const i = await choiceMenu(items, {x:230, y:140, title:`${caster.name}  MP ${caster.mp}/${mMaxMp(caster)}`});
      if(i<0) break;
      const id = caster.spells[i];
      const sp = SPELLS[id];
      if(!sp.field){ await msg('それは たたかいの なかでしか つかえない！'); continue; }
      if(caster.mp < sp.mp){ await msg('MPが たりない！'); continue; }
      if(sp.t==='heal'){
        const tgt = await chooseMember('だれに？', m=>m.hp>0, {right:m=>`${m.hp}/${mMaxHp(m)}`});
        if(!tgt) continue;
        if(tgt.hp>=mMaxHp(tgt)){ await msg(`${tgt.name}の HPは まんたんだ！`); continue; }
        caster.mp -= sp.mp;
        const n = Math.min(ri(sp.min,sp.max), mMaxHp(tgt)-tgt.hp);
        tgt.hp += n;
        SFX.heal();
        await msg(`${caster.name}は ${sp.name}を となえた！`, `${tgt.name}の HPが ${n} かいふくした！`);
      } else if(sp.t==='fullheal'){
        const tgt = await chooseMember('だれに？', m=>m.hp>0, {right:m=>`${m.hp}/${mMaxHp(m)}`});
        if(!tgt) continue;
        if(tgt.hp>=mMaxHp(tgt)){ await msg(`${tgt.name}の HPは まんたんだ！`); continue; }
        caster.mp -= sp.mp;
        tgt.hp = mMaxHp(tgt);
        SFX.heal();
        await msg(`${caster.name}は ${sp.name}を となえた！`, `${tgt.name}の HPが かんぜんに かいふくした！`);
      } else if(sp.t==='healall'){
        if(G.party.every(m=>m.hp<=0 || m.hp>=mMaxHp(m))){ await msg('みんなの HPは まんたんだ！'); continue; }
        caster.mp -= sp.mp;
        SFX.heal();
        for(const m of aliveParty()){
          m.hp = Math.min(mMaxHp(m), m.hp + ri(sp.min,sp.max));
        }
        await msg(`${caster.name}は ${sp.name}を となえた！`, 'みんなの HPが かいふくした！');
      } else if(sp.t==='cure'){
        const tgt = await chooseMember('だれに？', m=>m.poison);
        if(!tgt){ await msg('どくに かかっている なかまは いない。'); continue; }
        caster.mp -= sp.mp;
        tgt.poison = false;
        SFX.heal();
        await msg(`${caster.name}は ${sp.name}を となえた！`, `${tgt.name}の どくが きえさった！`);
      } else if(sp.t==='revive'){
        const tgt = await chooseMember('だれに？', m=>m.hp<=0);
        if(!tgt){ await msg('ちからつきた なかまは いない。'); continue; }
        caster.mp -= sp.mp;
        SFX.revive();
        tgt.hp = Math.floor(mMaxHp(tgt)/2);
        await msg(`${caster.name}は ${sp.name}を となえた！`, `${tgt.name}は いきかえった！`);
      } else if(sp.t==='return'){
        const ok = await yesno([`${MAPS[G.lastTown].name}へ もどりますか？`]);
        if(!ok) continue;
        caster.mp -= sp.mp;
        SFX.spell();
        await msg(`${caster.name}は リターンを となえた！`);
        const dst = MAPS[G.lastTown].exitTo;
        enterMap('world', dst.x, dst.y);
        return true;
      }
    }
  }
}

async function itemMenuField(){
  for(;;){
    if(G.inv.length===0){ await msg('なにも もっていない。'); return false; }
    const items = G.inv.map(e=>({label:ITEMS[e.id].name + (e.n>1?` x${e.n}`:''), right: ITEMS[e.id].type!=='tool' ? 'そうび' : ''}));
    const i = await choiceMenu(items, {x:210, y:130, title:'どうぐ'});
    if(i<0) return false;
    const id = G.inv[i].id;
    const it = ITEMS[id];
    if(it.type!=='tool'){ await equipFromBag(id); continue; }
    if(it.t==='heal'){
      const tgt = await chooseMember('だれに？', m=>m.hp>0, {right:m=>`${m.hp}/${mMaxHp(m)}`});
      if(!tgt) continue;
      if(tgt.hp>=mMaxHp(tgt)){ await msg(`${tgt.name}の HPは まんたんだ！`); continue; }
      const n = Math.min(ri(it.min,it.max), mMaxHp(tgt)-tgt.hp);
      tgt.hp += n; removeItem(id);
      SFX.heal();
      await msg(`${it.name}を つかった！`, `${tgt.name}の HPが ${n} かいふくした！`);
    } else if(it.t==='mp'){
      const tgt = await chooseMember('だれに？', m=>m.hp>0 && mMaxMp(m)>0, {right:m=>`MP${m.mp}/${mMaxMp(m)}`});
      if(!tgt) continue;
      if(tgt.mp>=mMaxMp(tgt)){ await msg(`${tgt.name}の MPは まんたんだ！`); continue; }
      const n = Math.min(it.amt, mMaxMp(tgt)-tgt.mp);
      tgt.mp += n; removeItem(id);
      SFX.heal();
      await msg(`${it.name}を つかった！`, `${tgt.name}の MPが ${n} かいふくした！`);
    } else if(it.t==='cure'){
      const tgt = await chooseMember('だれに？', m=>m.poison);
      if(!tgt){ await msg('どくに かかっている なかまは いない。'); continue; }
      tgt.poison = false; removeItem(id);
      SFX.heal();
      await msg(`${it.name}を つかった！`, `${tgt.name}の どくが きえさった！`);
    } else if(it.t==='revive'){
      const tgt = await chooseMember('だれに？', m=>m.hp<=0);
      if(!tgt){ await msg('ちからつきた なかまは いない。'); continue; }
      removeItem(id);
      SFX.revive();
      tgt.hp = mMaxHp(tgt);
      await msg(`${it.name}を つかった！`, `${tgt.name}は いきかえった！`);
    } else if(it.t==='seed'){
      const tgt = await chooseMember('だれに？', m=>m.hp>0);
      if(!tgt) continue;
      removeItem(id);
      SFX.levelup();
      if(it.stat==='str'){ tgt.strB=(tgt.strB||0)+it.amt; await msg(`${tgt.name}は ${it.name}を たべた！`, `ちからが ${it.amt} あがった！`); }
      else if(it.stat==='def'){ tgt.defB=(tgt.defB||0)+it.amt; await msg(`${tgt.name}は ${it.name}を たべた！`, `しゅびりょくが ${it.amt} あがった！`); }
      else { tgt.agiB=(tgt.agiB||0)+it.amt; await msg(`${tgt.name}は ${it.name}を たべた！`, `すばやさが ${it.amt} あがった！`); }
    } else if(it.t==='return'){
      const ok = await yesno([`${MAPS[G.lastTown].name}へ もどりますか？`]);
      if(!ok) continue;
      removeItem(id);
      SFX.spell();
      await msg(`${it.name}を つかった！`);
      const dst = MAPS[G.lastTown].exitTo;
      enterMap('world', dst.x, dst.y);
      return true;
    }
  }
}

// ---------------- そうびメニュー ----------------
async function equipMenu(){
  for(;;){
    const m = await chooseMember('だれの そうび？', null, {x:210, y:130, right:m=>CLASSES[m.id].role, w:320});
    if(!m) return;
    for(;;){
      const slots = [
        {key:'weapon', label:'ぶき',   type:'weapon'},
        {key:'armor',  label:'よろい', type:'armor'},
        {key:'shield', label:'たて',   type:'shield'},
      ];
      const items = slots.map(s=>({label:s.label, right: m[s.key] ? ITEMS[m[s.key]].name : '──'}));
      const si = await choiceMenu(items, {x:230, y:140, title:`${m.name} こうげき${mAtk(m)} しゅび${mDef(m)}`, w:380});
      if(si<0) break;
      const slot = slots[si];
      const cands = G.inv.filter(e=>ITEMS[e.id].type===slot.type && canEquip(m, e.id));
      const list = cands.map(e=>{
        const diff = ITEMS[e.id].pow - (m[slot.key] ? ITEMS[m[slot.key]].pow : 0);
        return {label:ITEMS[e.id].name, right:`${diff>=0?'+':''}${diff}`};
      });
      if(m[slot.key]) list.push({label:'はずす', right:''});
      if(list.length===0){ await msg('そうびできる ものを もっていない。'); continue; }
      const ii = await choiceMenu(list, {x:260, y:150, title:slot.label});
      if(ii<0) continue;
      if(ii>=cands.length){
        addItem(m[slot.key]);
        await msg(`${ITEMS[m[slot.key]].name}を はずした。`);
        m[slot.key] = null;
        continue;
      }
      const id = cands[ii].id;
      const old = m[slot.key];
      m[slot.key] = id;
      removeItem(id);
      if(old) addItem(old);
      SFX.ok();
      await msg(`${m.name}は ${ITEMS[id].name}を そうびした！`);
    }
  }
}

// ---------------- つよさ ----------------
async function statsFlow(){
  for(;;){
    const m = await chooseMember('だれの つよさ？', null, {x:210, y:130, right:m=>`Lv${m.lv}`});
    if(!m) return;
    menuStack.push({statsPanel:m});
    await waitKey(['ok','cancel']);
    SFX.cancel();
    menuStack.pop();
  }
}

async function doSave(){
  const playMs = G.playMs + (Date.now()-playStart);
  G.playMs = playMs; playStart = Date.now();
  const data = {G, map:curMap, x:hero.x, y:hero.y};
  try{
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    SFX.heal();
    await msg('ぼうけんのしょに きろくした！');
  }catch(e){
    await msg('セーブに しっぱいした……');
  }
}

function loadGame(){
  const data = JSON.parse(localStorage.getItem(SAVE_KEY));
  G = data.G;
  playStart = Date.now();
  enterMap(data.map, data.x, data.y);
}

// ---------------- 経験値・レベルアップ ----------------
async function gainExpGold(exp, gold){
  G.gold += gold;
  await msg(`けいけんち ${exp}ポイントを かくとく！`, `${gold}ゴールドを てにいれた！`);
  for(const m of G.party){
    const gain = m.hp>0 ? exp : Math.floor(exp/2);
    m.exp += gain;
    while(m.lv < MAX_LV && m.exp >= EXP_TABLE[m.lv+1]){
      const old = {hp:mMaxHp(m), mp:mMaxMp(m), str:mStr(m), agi:mAgi(m)};
      m.lv++;
      if(m.hp>0){
        m.hp += mMaxHp(m)-old.hp;
        m.mp += mMaxMp(m)-old.mp;
      }
      SFX.levelup();
      await msg(`${m.name}は レベル${m.lv}に あがった！`,
        `さいだいHP+${mMaxHp(m)-old.hp}  さいだいMP+${mMaxMp(m)-old.mp}`,
        `ちから+${mStr(m)-old.str}  すばやさ+${mAgi(m)-old.agi}`);
      const spId = CLASSES[m.id].learn[m.lv];
      if(spId && !m.spells.includes(spId)){
        m.spells.push(spId);
        SFX.spell();
        await msg(`${m.name}は じゅもん『${SPELLS[spId].name}』を おぼえた！`);
      }
    }
  }
}

// ---------------- 全滅 ----------------
async function handleDeath(){
  stopBgm();
  SFX.die();
  await msg('パーティは ぜんめつした……', 'めのまえが まっくらに なった……');
  G.gold = Math.floor(G.gold/2);
  for(const m of G.party){ m.hp = mMaxHp(m); m.mp = mMaxMp(m); m.poison = false; }
  const town = G.lastTown || 'rion';
  enterMap(town, MAPS[town].entry.x, MAPS[town].entry.y);
  scene = 'field';
  await msg('「しっかりしてください！」',
    `${MAPS[town].name}まで はこばれたようだ。`,
    'しょじきんが はんぶんに なってしまった……');
}

// ---------------- ニューゲーム・オープニング ----------------
async function newGame(){
  let name = '';
  try{ name = window.prompt('ゆうしゃの なまえを いれてください（6もじまで）','リュカ') || ''; }catch(e){}
  name = name.trim().slice(0,6) || 'リュカ';
  G = {
    party:[], gold:80,
    inv:[], flags:{}, chests:{},
    map:'rion', x:10, y:12,
    lastTown:'rion', playMs:0,
  };
  const heroM = makeMember('ryuka', 1);
  heroM.name = name;
  G.party.push(heroM);
  playStart = Date.now();
  scene = 'story';
  stopBgm();
  await msg('まおうザルバが ほろびて 10ねん──',
    'せかいは ゆうしゃユウの のこした せいなる星に',
    'まもられ へいわに くらしていた。');
  await msg('しかし ある よる、 星は とつぜん くだけちり',
    '5つの かけらと なって せかいに とびちった。',
    'ふたたび うごめきだす やみの けはい……。');
  await msg(`リオンむらの わかもの ${name}は`,
    'むらおさに よばれ しずかに めを さました。',
    '── あたらしい でんせつが いま はじまる ──');
  enterMap('rion', MAPS.rion.entry.x, MAPS.rion.entry.y);
  scene = 'field';
  eventLock = true;
  try{
    await msg('「よう！ おはようさん！」',
      'おさななじみの せんし ガルドが かけよってきた。');
    await msg('「むらおさが よんでたぜ。 ひろばの きたに いる。」',
      '「なんだか おおごとみたいだ… おれも いっしょに いくよ！」');
    SFX.join();
    joinMember('garde', 1);
    G.flags.j_garde = 1;
    await msg('せんし ガルドが なかまに くわわった！');
  } finally { eventLock = false; }
}

// ---------------- タイトル ----------------
async function titleScreen(){
  scene = 'title';
  playBgm('title');
  await waitKey(['ok']);
  SFX.ok();
  const has = !!localStorage.getItem(SAVE_KEY);
  const items = has ? ['つづきから','はじめから'] : ['はじめから'];
  const i = await choiceMenu(items, {x:W/2-95, y:310, w:190, cancelable:false});
  return (has && i===0) ? 'load' : 'new';
}

// ---------------- エンディング ----------------
async function endingSeq(){
  stopBgm();
  SFX.crystal();
  await msg('しんまおう ノワールは ほろび',
    'せかいを むしばんでいた やみは きえさった……！');
  scene = 'ending';
  playBgm('ending');
  await msg('5つの ほしのかけらが そらへ まいあがり',
    'ひとつの 星となって ふたたび せかいを てらしだす。');
  const names = G.party.map(m=>m.name).join('、 ');
  await msg(`${names}。`,
    '4にんの なは あたらしい でんせつとなり',
    'えいえんに かたりつがれる ことだろう。');
  if(G.flags.m4){
    await msg('そして── きおくの祭壇で ほほえむ かげが ひとつ。',
      '「みごとじゃ。 せかいは よき てに わたった。」',
      'ゆうしゃユウの まぼろしは しずかに きえていった。');
  }
  const ms = G.playMs + (Date.now()-playStart);
  await msg(`クリアタイム： ${fmtTime(ms)}`,
    `とうたつレベル： ${G.party.map(m=>'Lv'+m.lv).join(' ')}`,
    '── THE END ── あそんでくれて ありがとう！');
  await waitKey(['ok']);
  if(endResolver){ const r = endResolver; endResolver = null; r(); }
}

// ============================================================
// 描画
// ============================================================
function txt(s, x, y, size=18, color='#fff', align='left'){
  ctx.font = `${size}px "DotGothic16","MS Gothic",monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
  ctx.textAlign = 'left';
}
function emoji(s, x, y, size=26){
  ctx.font = `${size}px "Segoe UI Emoji",serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
function drawWin(x, y, w, h){
  ctx.fillStyle = 'rgba(6,8,18,0.9)';
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(x+2, y+2, w-4, h-4, 6); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(x+7, y+7, w-14, h-14, 4); ctx.stroke();
}

const THEMES = {
  rion:   {wall:'#9a7b50', floor:'#caa46a'},
  grandia:{wall:'#8a8a9a', floor:'#cabe9a'},
  marina: {wall:'#8a7b6a', floor:'#c8b48a'},
  sandra: {wall:'#b09060', floor:'#e0c890'},
  fubuki: {wall:'#7a8aa0', floor:'#c8d4e4'},
  elf:    {wall:'#5a7a50', floor:'#a0c890'},
  cave1:  {wall:'#3a2d24', floor:'#6b5640'},
  ruins:  {wall:'#1f3a28', floor:'#41684c'},
  pyramid:{wall:'#6a5530', floor:'#c8a860'},
  volcano:{wall:'#40201a', floor:'#7a4030'},
  icetemple:{wall:'#26344c', floor:'#5b7a9c'},
  altar:  {wall:'#3a3a5c', floor:'#8a8ab0'},
  darkcastle:{wall:'#241a2e', floor:'#473754'},
  world:  {wall:'#555',    floor:'#888'},
};

// 入口タイルの下地
const ENT_GROUND = {
  '1':'grass', '2':'grass', '3':'grass', '4':'sand', '5':'snow', '6':'grass',
  'c':'grass', 'f':'grass', 'p':'sand', 'v':'dirt', 'i':'snow', 'h':'grass', 'X':'dirt',
};
const ENT_GROUND_PROC = {
  '1':'#3f9e3f', '2':'#3f9e3f', '3':'#3f9e3f', '4':'#ddc278', '5':'#e8f0f8', '6':'#3f9e3f',
  'c':'#3f9e3f', 'f':'#3f9e3f', 'p':'#ddc278', 'v':'#8a5a40', 'i':'#e8f0f8', 'h':'#3f9e3f', 'X':'#8a5a40',
};

function drawTile(ch, sx, sy, x, y){
  if(assetsReady && drawTileImg(ch, sx, sy, x, y)) return;
  drawTileProc(ch, sx, sy, x, y);
}

function drawTileImg(ch, sx, sy, x, y){
  const dt = DUNGEON_TEX[curMap];
  switch(ch){
    case '.': return drawGround('grass', sx,sy,x,y, true);
    case ',': return drawGround('tallgrass', sx,sy,x,y, true);
    case 'F': return drawGround('forest', sx,sy,x,y, true);
    case '~': return drawGround('water', sx,sy,x,y, true);
    case 'm': return drawGround('mountain', sx,sy,x,y, true);
    case 'S': return drawGround('snow', sx,sy,x,y, true);
    case 's': return drawGround('sand', sx,sy,x,y, true);
    case 'd': return drawGround('dirt', sx,sy,x,y, true);
    case '=': return drawGround('bridge', sx,sy,x,y, false);
    case 'T': return drawGround(curMap==='fubuki' ? 'snow' : 'forest', sx,sy,x,y, true);
    case 'W': return drawGround('wall_house', sx,sy,x,y, false);
    case 'n': return drawGround('wall_window', sx,sy,x,y, false);
    case 'r': return drawGround('roof_red', sx,sy,x,y, false);
    case 'b': return drawGround('roof_blue', sx,sy,x,y, false);
    case 'D': return drawGround('door', sx,sy,x,y, false);
    case 'B': return drawGround('wall_brick', sx,sy,x,y, false);
    case '_': return drawGround('marble', sx,sy,x,y, false);
    case 'k': return drawGround('carpet', sx,sy,x,y, false);
    case 'K': return drawGround('dock', sx,sy,x,y, false);
    case 'L': return drawGround('lava', sx,sy,x,y, true); // 専用画像があれば使う
    case '#': {
      if(!dt) return false;
      let name = pickOk(dt.wall);
      if(!name) return false;
      if(curMap==='darkcastle' && (x===15||x===17) && y>=4 && y<=12 && (y%2===0)) name='wall_torch';
      else if(curMap==='darkcastle' && (x===14||x===18) && y<=3) name='wall_banner';
      return drawGround(name, sx,sy,x,y, false);
    }
    case '-': {
      if(!dt) return false;
      let name = pickOk(dt.floor), flip = true;
      if(!name) return false;
      if(curMap==='darkcastle'){
        if(x===16 && y>=1 && y<=15){ name='carpet'; flip=false; }
        else if(y<=3){ name='marble'; flip=false; }
      }
      return drawGround(name, sx,sy,x,y, flip);
    }
    case '>': return drawGround('stairs', sx,sy,x,y, false);
    case 'g': {
      if(G && G.flags.gate){
        return drawGround('bridge', sx,sy,x,y,false);
      }
      if(!drawGround('water', sx,sy,x,y,false)) return false;
      drawIconFit('gate', sx+16, sy+15, 34);
      return true;
    }
    default: {
      if(ENT_GROUND[ch]){
        if(!drawGround(ENT_GROUND[ch], sx,sy,x,y,false)) return false;
        drawIconFit(TILE_IMG[ch], sx+16, sy+15, 34);
        return true;
      }
      return false;
    }
  }
}

function drawTileProc(ch, sx, sy, x, y){
  const th = THEMES[curMap] || THEMES.world;
  const v = (x*7 + y*13) % 5;
  switch(ch){
    case '.': {
      ctx.fillStyle = '#3f9e3f'; ctx.fillRect(sx,sy,TS,TS);
      if(v===0){ ctx.fillStyle='#37913a'; ctx.fillRect(sx+8,sy+10,3,3); ctx.fillRect(sx+20,sy+22,3,3); }
      break;
    }
    case ',': {
      ctx.fillStyle = '#379337'; ctx.fillRect(sx,sy,TS,TS);
      ctx.strokeStyle = '#2a7d2e'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx+8,sy+24); ctx.lineTo(sx+8,sy+14);
      ctx.moveTo(sx+16,sy+26); ctx.lineTo(sx+16,sy+12);
      ctx.moveTo(sx+24,sy+24); ctx.lineTo(sx+24,sy+14);
      ctx.stroke();
      break;
    }
    case 'F': {
      ctx.fillStyle = '#2e7d32'; ctx.fillRect(sx,sy,TS,TS);
      ctx.fillStyle = '#6d4c33'; ctx.fillRect(sx+14,sy+22,5,7);
      ctx.fillStyle = '#1b5e20';
      ctx.beginPath(); ctx.moveTo(sx+16,sy+3); ctx.lineTo(sx+28,sy+23); ctx.lineTo(sx+4,sy+23); ctx.closePath(); ctx.fill();
      break;
    }
    case '~': {
      ctx.fillStyle = '#2b59c3'; ctx.fillRect(sx,sy,TS,TS);
      ctx.strokeStyle = 'rgba(160,200,255,0.5)'; ctx.lineWidth = 2;
      const ph = Math.floor(frame/24 + v) % 2;
      ctx.beginPath();
      ctx.moveTo(sx+4, sy+12+ph*8); ctx.quadraticCurveTo(sx+10, sy+8+ph*8, sx+16, sy+12+ph*8);
      ctx.quadraticCurveTo(sx+22, sy+16+ph*8, sx+28, sy+12+ph*8);
      ctx.stroke();
      break;
    }
    case 'm': {
      const snow = curMap==='world' && y<14;
      ctx.fillStyle = snow ? '#e8f0f8' : '#3f9e3f'; ctx.fillRect(sx,sy,TS,TS);
      ctx.fillStyle = '#7d6555';
      ctx.beginPath(); ctx.moveTo(sx+16,sy+3); ctx.lineTo(sx+30,sy+29); ctx.lineTo(sx+2,sy+29); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(sx+16,sy+3); ctx.lineTo(sx+21,sy+12); ctx.lineTo(sx+11,sy+12); ctx.closePath(); ctx.fill();
      break;
    }
    case 'S': {
      ctx.fillStyle = '#e8f0f8'; ctx.fillRect(sx,sy,TS,TS);
      if(v<2){ ctx.fillStyle='#cdd9ea'; ctx.fillRect(sx+6+v*10,sy+8+v*9,3,3); }
      break;
    }
    case 's': {
      ctx.fillStyle = '#ddc278'; ctx.fillRect(sx,sy,TS,TS);
      if(v<2){ ctx.fillStyle='#cdb068'; ctx.fillRect(sx+5+v*12,sy+9+v*8,4,3); }
      break;
    }
    case 'd': {
      ctx.fillStyle = '#8a5a40'; ctx.fillRect(sx,sy,TS,TS);
      if(v===0){ ctx.fillStyle='#7a4c34'; ctx.fillRect(sx+9,sy+12,5,4); ctx.fillRect(sx+20,sy+22,4,3); }
      break;
    }
    case 'L': {
      const ph = Math.abs(Math.sin(frame/30 + v));
      ctx.fillStyle = `rgb(${200+Math.floor(ph*55)},${60+Math.floor(ph*60)},20)`;
      ctx.fillRect(sx,sy,TS,TS);
      ctx.fillStyle = 'rgba(255,230,120,0.7)';
      ctx.fillRect(sx+6+v*3, sy+8+v*2, 5, 4);
      ctx.fillRect(sx+18, sy+20, 6, 4);
      break;
    }
    case '=': {
      ctx.fillStyle = '#2b59c3'; ctx.fillRect(sx,sy,TS,TS);
      ctx.fillStyle = '#9c6b3f'; ctx.fillRect(sx+2,sy,TS-4,TS);
      ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 2;
      for(let i=1;i<4;i++){ ctx.beginPath(); ctx.moveTo(sx+2,sy+i*8); ctx.lineTo(sx+TS-2,sy+i*8); ctx.stroke(); }
      break;
    }
    case 'T': {
      ctx.fillStyle = curMap==='fubuki' ? '#e8f0f8' : '#3f9e3f'; ctx.fillRect(sx,sy,TS,TS);
      ctx.fillStyle = '#6d4c33'; ctx.fillRect(sx+13,sy+20,6,9);
      ctx.fillStyle = curMap==='fubuki' ? '#4a7d5a' : '#1e6b24';
      ctx.beginPath(); ctx.arc(sx+16,sy+13,11,0,7); ctx.fill();
      break;
    }
    case 'W': {
      ctx.fillStyle = th.wall; ctx.fillRect(sx,sy,TS,TS);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx,sy+11); ctx.lineTo(sx+TS,sy+11);
      ctx.moveTo(sx,sy+22); ctx.lineTo(sx+TS,sy+22);
      ctx.moveTo(sx+16,sy); ctx.lineTo(sx+16,sy+11);
      ctx.moveTo(sx+8,sy+11); ctx.lineTo(sx+8,sy+22);
      ctx.moveTo(sx+24,sy+22); ctx.lineTo(sx+24,sy+32);
      ctx.stroke();
      break;
    }
    case 'n': case 'r': case 'b': case 'D': {
      ctx.fillStyle = ch==='r' ? '#a33' : ch==='b' ? '#33a' : th.wall;
      ctx.fillRect(sx,sy,TS,TS);
      if(ch==='n'){ ctx.fillStyle='#9fd0ff'; ctx.fillRect(sx+8,sy+8,16,14); }
      if(ch==='D'){ ctx.fillStyle='#5a3a20'; ctx.fillRect(sx+7,sy+6,18,26); }
      break;
    }
    case 'B': {
      ctx.fillStyle = '#8a8a9a'; ctx.fillRect(sx,sy,TS,TS);
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
      ctx.strokeRect(sx+1,sy+1,TS-2,TS-2);
      ctx.beginPath(); ctx.moveTo(sx,sy+16); ctx.lineTo(sx+TS,sy+16); ctx.stroke();
      break;
    }
    case '_': {
      ctx.fillStyle = '#d8d8e4'; ctx.fillRect(sx,sy,TS,TS);
      ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.strokeRect(sx,sy,TS,TS);
      break;
    }
    case 'k': {
      ctx.fillStyle = '#a32638'; ctx.fillRect(sx,sy,TS,TS);
      ctx.strokeStyle = '#7a1a28'; ctx.lineWidth=1; ctx.strokeRect(sx+3,sy+3,TS-6,TS-6);
      break;
    }
    case 'K': {
      ctx.fillStyle = '#9c6b3f'; ctx.fillRect(sx,sy,TS,TS);
      ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 2;
      for(let i=1;i<4;i++){ ctx.beginPath(); ctx.moveTo(sx,sy+i*8); ctx.lineTo(sx+TS,sy+i*8); ctx.stroke(); }
      break;
    }
    case '#': {
      ctx.fillStyle = th.wall; ctx.fillRect(sx,sy,TS,TS);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
      ctx.strokeRect(sx+1,sy+1,TS-2,TS-2);
      ctx.beginPath(); ctx.moveTo(sx,sy+16); ctx.lineTo(sx+TS,sy+16); ctx.stroke();
      break;
    }
    case '-': {
      ctx.fillStyle = th.floor; ctx.fillRect(sx,sy,TS,TS);
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1;
      ctx.strokeRect(sx,sy,TS,TS);
      break;
    }
    case '>': {
      ctx.fillStyle = th.floor; ctx.fillRect(sx,sy,TS,TS);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(sx+6,sy+6,20,20);
      ctx.fillStyle = '#ddd';
      ctx.fillRect(sx+8,sy+20,16,4); ctx.fillRect(sx+11,sy+14,13,4); ctx.fillRect(sx+14,sy+8,10,4);
      break;
    }
    case 'g': {
      if(G && G.flags.gate){ drawTileProc('=', sx, sy, x, y); }
      else {
        ctx.fillStyle = '#2b59c3'; ctx.fillRect(sx,sy,TS,TS);
        if(!drawIconFit('gate', sx+16, sy+15, 34)) emoji('🔒', sx+16, sy+17, 18);
      }
      break;
    }
    default: {
      if(ENT_GROUND_PROC[ch]){
        ctx.fillStyle = ENT_GROUND_PROC[ch]; ctx.fillRect(sx,sy,TS,TS);
        if(!drawIconFit(TILE_IMG[ch], sx+16, sy+15, 34)) emoji('🏠',sx+16,sy+16,24);
      } else {
        ctx.fillStyle = '#000'; ctx.fillRect(sx,sy,TS,TS);
      }
    }
  }
}

function getCam(){
  const m = MAPS[curMap];
  const mw = m.tiles[0].length*TS, mh = m.tiles.length*TS;
  let cx = hero.px + TS/2 - W/2;
  let cy = hero.py + TS/2 - H/2;
  if(mw <= W) cx = (mw-W)/2; else cx = Math.max(0, Math.min(cx, mw-W));
  if(mh <= H) cy = (mh-H)/2; else cy = Math.max(0, Math.min(cy, mh-H));
  return [cx, cy];
}

function drawBoat(sx, sy){
  ctx.fillStyle = '#7a4a26';
  ctx.beginPath();
  ctx.moveTo(sx+2, sy+16);
  ctx.lineTo(sx+30, sy+16);
  ctx.lineTo(sx+25, sy+28);
  ctx.lineTo(sx+7, sy+28);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#9c6b3f';
  ctx.fillRect(sx+2, sy+13, 28, 4);
}

function drawField(){
  const m = MAPS[curMap];
  const [cx, cy] = getCam();
  const x0 = Math.floor(cx/TS)-1, y0 = Math.floor(cy/TS)-1;
  for(let y=y0; y<=y0+VH+2; y++){
    for(let x=x0; x<=x0+VW+2; x++){
      drawTile(getTile(curMap,x,y), Math.round(x*TS-cx), Math.round(y*TS-cy), x, y);
    }
  }
  // オブジェクト
  for(const o of (m.objects||[])){
    const sx = Math.round(o.x*TS-cx), sy = Math.round(o.y*TS-cy);
    if(sx<-TS||sy<-TS||sx>W||sy>H) continue;
    if(o.type==='chest' && !G.chests[o.id]){
      if(!drawIconFit('chest', sx+16, sy+16, 30)) emoji('📦', sx+16, sy+17, 24);
    }
    if(o.type==='boss' && !G.flags[o.flag]){
      if(!drawSpriteBottom(monImg(o.monster), sx+16, sy+34, 42)) emoji(MONSTERS[o.monster].emoji, sx+16, sy+16, 26);
    }
  }
  // NPC
  for(const n of npcRT){
    const sx = Math.round(n.x*TS-cx), sy = Math.round(n.y*TS-cy);
    if(sx<-TS||sy<-TS||sx>W||sy>H) continue;
    if(!drawSpriteBottom(npcImg(n.emoji), sx+16, sy+33, 40)) emoji(n.emoji, sx+16, sy+15, 24);
  }
  // パーティ隊列
  const onSea = m.world && getTile(curMap, hero.x, hero.y)==='~';
  const alive = aliveParty();
  // 移動の進行度 0..1
  let prog = 0;
  if(hero.moving){
    const total = TS;
    const moved = Math.max(Math.abs(hero.px - trail[0].x*TS), Math.abs(hero.py - trail[0].y*TS));
    prog = Math.min(1, moved/total);
  }
  if(!onSea){
    // 後続メンバー（後ろから描いて前を上に）
    for(let i=alive.length-1; i>=1; i--){
      const from = trail[Math.min(i, trail.length-1)];
      const to = trail[Math.min(i-1, trail.length-1)];
      let px = from.x*TS, py = from.y*TS, dir = to.dir;
      if(hero.moving){
        px = from.x*TS + (to.x-from.x)*TS*prog;
        py = from.y*TS + (to.y-from.y)*TS*prog;
      }
      const sx = Math.round(px-cx), sy = Math.round(py-cy);
      if(sx<-TS||sy<-TS||sx>W||sy>H) continue;
      const chr = CLASSES[alive[i].id].img;
      if(!drawPartyChar(chr, dir, sx+16, sy+33, 40)) emoji('🧍', sx+16, sy+15, 24);
    }
  }
  // 勇者（先頭）
  {
    const sx = Math.round(hero.px-cx), sy = Math.round(hero.py-cy);
    if(onSea){
      if(!drawSpriteBottom('ship', sx+16, sy+31, 36, hero.dir==='right')) drawBoat(sx, sy);
      drawPartyChar('ryuka', hero.dir, sx+16, sy+26, 34);
    } else {
      if(!drawPartyChar(CLASSES[alive[0] ? alive[0].id : 'ryuka'].img, hero.dir, sx+16, sy+33, 42)){
        emoji('🦸', sx+16, sy+15, 26);
      }
    }
  }
  // マップ名バナー
  if(mapBanner>0){
    const name = m.name;
    const w2 = name.length*20+48;
    drawWin(W/2-w2/2, 14, w2, 42);
    txt(name, W/2, 42, 19, '#fff', 'center');
  }
  drawStatus();
  if(poisonFlash>0){
    ctx.fillStyle = `rgba(140,60,200,${poisonFlash/40})`;
    ctx.fillRect(0,0,W,H);
    poisonFlash--;
  }
}

// ---------------- ステータス窓（パーティ4人） ----------------
function drawStatus(activeIdx=-1){
  if(!G) return;
  const n = G.party.length;
  const w = 162, gap = 8;
  for(let i=0;i<n;i++){
    const m = G.party[i];
    const x = 8 + i*(w+gap);
    drawWin(x, 8, w, 92);
    const dead = m.hp<=0;
    const nameCol = i===activeIdx ? '#ffe34d' : dead ? '#888' : '#fff';
    txt(m.name, x+14, 32, 16, nameCol);
    txt(`Lv${m.lv}`, x+w-14, 32, 14, '#ffe34d', 'right');
    const hpCol = dead ? '#ff7a6b' : m.hp<=mMaxHp(m)/4 ? '#ff7a6b' : '#fff';
    txt(`ＨＰ ${m.hp}`, x+14, 56, 15, hpCol);
    txt(`ＭＰ ${m.mp}`, x+14, 78, 15, mMaxMp(m)>0 ? '#9fd0ff' : '#556');
    if(dead) txt('☠', x+w-22, 78, 16, '#ff7a6b');
    else if(m.poison) txt('毒', x+w-26, 78, 14, '#c08aff');
  }
  // ゴールド
  drawWin(W-118, H-150, 110, 38);
  txt(`${G.gold}Ｇ`, W-63, H-124, 15, '#ffe34d', 'center');
}

function drawTitle(){
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#06061a'); g.addColorStop(1,'#1a1040');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  for(let i=0;i<40;i++){
    const x = (i*97)%W, y = (i*61)%(H-160);
    ctx.fillStyle = `rgba(255,255,255,${0.3+0.5*Math.abs(Math.sin(frame/40+i))})`;
    ctx.fillRect(x, y, 2, 2);
  }
  if(!drawIconFit(pickOk(['logo2','logo']), W/2, 120, 180)){
    emoji('🏰', W/2, 110, 64);
  }
  txt('ヒカリの伝説 II', W/2, 248, 52, '#ffe34d', 'center');
  txt('〜 よみがえる闇 〜', W/2, 286, 22, '#fff', 'center');
  if(menuStack.length===0 && Math.floor(frame/30)%2===0){
    txt('PRESS Z', W/2, 336, 22, '#fff', 'center');
  }
  txt('© 2026 placeholder graphics edition', W/2, H-20, 12, '#667', 'center');
}

function drawEnding(){
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#0a0a2a'); g.addColorStop(1,'#2a1a4a');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  for(let i=0;i<60;i++){
    const x = (i*113)%W, y = (i*71)%H;
    ctx.fillStyle = `rgba(255,255,220,${0.3+0.5*Math.abs(Math.sin(frame/30+i*2))})`;
    ctx.fillRect(x, y, 2, 2);
  }
  emoji('🏰', W/2, 100, 70);
  emoji('✨', W/2-90, 70, 30);
  emoji('✨', W/2+90, 130, 30);
  // パーティ4人
  const imgs = G ? G.party.map(m=>CLASSES[m.id].img) : ['ryuka'];
  imgs.forEach((c,i)=>{
    const x = W/2 + (i-(imgs.length-1)/2)*70;
    if(!drawPartyChar(c, 'down', x, 230, 52)) emoji('🦸', x, 210, 40);
  });
  txt('せかいに ひかりが もどった', W/2, 280, 26, '#ffe34d', 'center');
}

function drawMsg(){
  if(!msgState) return;
  drawWin(16, H-126, W-32, 112);
  let remain = msgState.shown;
  let yy = H-92;
  let allShown = true;
  for(const line of msgState.lines){
    const take = Math.max(0, Math.min(line.length, remain));
    txt(line.slice(0, take), 40, yy, 19);
    remain -= line.length;
    if(take < line.length) allShown = false;
    yy += 30;
  }
  if(allShown && Math.floor(frame/20)%2===0){
    txt('▼', W/2, H-26, 16, '#fff', 'center');
  }
}

function drawMenus(){
  for(const m of menuStack){
    if(m.statsPanel){ drawStatsPanel(m.statsPanel); continue; }
    const titleH = m.title ? 30 : 0;
    const h = titleH + m.view*30 + 26;
    drawWin(m.x, m.y, m.w, h);
    if(m.title) txt(m.title, m.x+18, m.y+30, 16, '#9fd0ff');
    const end = Math.min(m.items.length, m.scroll + m.view);
    for(let i=m.scroll; i<end; i++){
      const yy = m.y + titleH + 30*(i-m.scroll) + 32;
      if(i===m.cursor) txt('▶', m.x+12, yy, 17, '#ffe34d');
      txt(m.items[i].label, m.x+34, yy, 18);
      if(m.items[i].right) txt(m.items[i].right, m.x+m.w-16, yy, 17, '#ffe34d', 'right');
    }
    if(m.scroll>0) txt('▲', m.x+m.w/2, m.y+16, 12, '#aaa', 'center');
    if(end<m.items.length) txt('▼', m.x+m.w/2, m.y+h-8, 12, '#aaa', 'center');
  }
}

function drawStatsPanel(m){
  drawWin(150, 30, 420, 396);
  const eq = id => id ? ITEMS[id].name : '──';
  const next = m.lv>=MAX_LV ? '──' : (EXP_TABLE[m.lv+1] - m.exp);
  const rows = [
    ['なまえ', `${m.name}（${CLASSES[m.id].role}）`],
    ['レベル', m.lv],
    ['けいけんち', m.exp],
    ['つぎのレベルまで', next],
    ['ＨＰ', `${m.hp} / ${mMaxHp(m)}`],
    ['ＭＰ', `${m.mp} / ${mMaxMp(m)}`],
    ['こうげき力', mAtk(m)],
    ['しゅび力', mDef(m)],
    ['すばやさ', mAgi(m)],
    ['ぶき', eq(m.weapon)],
    ['よろい', eq(m.armor)],
    ['たて', eq(m.shield)],
    ['じょうたい', m.hp<=0 ? 'しぼう' : m.poison ? 'どく' : 'けんこう'],
    ['ほしのかけら', `${shards()} / 5`],
    ['ぼうけんじかん', fmtTime(G.playMs + (Date.now()-playStart))],
  ];
  let yy = 60;
  for(const [k,v] of rows){
    txt(k, 176, yy, 16, '#9fd0ff');
    txt(String(v), 380, yy, 16);
    yy += 24;
  }
}

// ---------------- メインループ ----------------
function update(){
  frame++;
  if(msgState && msgState.shown < msgState.total) msgState.shown += 2;
  if(toast && --toast.t <= 0) toast = null;
  if(mapBanner>0) mapBanner--;
  if(fadeT>0) fadeT--;
  if(scene==='field') updateField();
}

function draw(){
  ctx.clearRect(0,0,W,H);
  if(scene==='loading'){ drawLoading(); return; }
  if(scene==='title') drawTitle();
  else if(scene==='story'){ ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H); }
  else if(scene==='field') drawField();
  else if(scene==='battle') drawBattle();
  else if(scene==='ending') drawEnding();
  drawMsg();
  drawMenus();
  if(toast){
    drawWin(W-190, H-50, 180, 40);
    txt(toast.text, W-100, H-24, 15, '#fff', 'center');
  }
  if(fadeT>0){
    ctx.fillStyle = `rgba(0,0,0,${Math.sin(Math.min(1,fadeT/80)*Math.PI)})`;
    ctx.fillRect(0,0,W,H);
  }
}

function loop(){
  update();
  draw();
  requestAnimationFrame(loop);
}

// ---------------- ゲームフロー ----------------
async function gameFlow(){
  for(;;){
    const sel = await titleScreen();
    if(sel==='new') await newGame();
    else loadGame();
    scene = 'field';
    if(!MAPS[curMap].bgm) playBgm('field');
    await new Promise(res=>{ endResolver = res; });
    stopBgm();
  }
}

function drawLoading(){
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#06061a'); g.addColorStop(1,'#1a1040');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  txt('ヒカリの伝説 II', W/2, H/2-40, 32, '#ffe34d', 'center');
  const bw = 360, bx = W/2-bw/2, by = H/2+10;
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, 18);
  ctx.fillStyle = '#5ad6ff'; ctx.fillRect(bx+2, by+2, (bw-4)*assetProgress, 14);
  txt(`now loading… ${Math.floor(assetProgress*100)}%`, W/2, by+50, 16, '#aab', 'center');
}

window.addEventListener('load', ()=>{
  cv = document.getElementById('game');
  ctx = cv.getContext('2d');
  initInput();
  scene = 'loading';
  requestAnimationFrame(loop);
  loadAssets(()=>{ gameFlow(); });
});
