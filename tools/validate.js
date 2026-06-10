// node tools/validate.js — データ整合性チェック
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ctx = {MON_IMG:{}, console};
vm.createContext(ctx);
// assets.js から定数だけ拾うため、まず assets.js を window/Image 抜きで部分評価はせず、
// data.js が参照する MON_IMG はスタブ済み。
vm.runInContext(fs.readFileSync(path.join(root,'data.js'),'utf8'), ctx);

const {WORLD_TILES, MAPS, ENTRANCES, WALKABLE, SHOPS, ITEMS, MONSTERS, ENC_TABLES,
       SPELLS, CLASSES, EXP_TABLE, MAX_LV, WORLD_ENC, ENC_RATE} = vm.runInContext(
  '({WORLD_TILES, MAPS, ENTRANCES, WALKABLE, SHOPS, ITEMS, MONSTERS, ENC_TABLES, SPELLS, CLASSES, EXP_TABLE, MAX_LV, WORLD_ENC, ENC_RATE})', ctx);

let errors = [], warns = [];
const err = s=>errors.push(s);
const warn = s=>warns.push(s);

// ---- 1. 各マップの行長チェック ----
for(const [id,m] of Object.entries(MAPS)){
  const w = m.tiles[0].length;
  m.tiles.forEach((row,y)=>{
    if(row.length!==w) err(`${id}: row ${y} length ${row.length} != ${w}`);
  });
}

// ---- 2. ワールドの入口タイルがすべて存在するか ----
const found = {};
WORLD_TILES.forEach((row,y)=>{
  [...row].forEach((ch,x)=>{
    if(ENTRANCES[ch]){
      if(found[ch]) err(`world: entrance '${ch}' duplicated at (${x},${y}) and (${found[ch]})`);
      found[ch] = `${x},${y}`;
    }
  });
});
for(const ch of Object.keys(ENTRANCES)){
  if(!found[ch]) err(`world: entrance '${ch}' (${ENTRANCES[ch]}) not found on map`);
}

// ---- 3. exitTo の地点が歩行可能か ----
for(const [id,m] of Object.entries(MAPS)){
  if(!m.exitTo) continue;
  const t = WORLD_TILES[m.exitTo.y]?.[m.exitTo.x];
  if(t===undefined || !WALKABLE.has(t)) err(`${id}: exitTo (${m.exitTo.x},${m.exitTo.y}) tile '${t}' not walkable`);
}
// entry 地点がマップ内で歩行可能か
for(const [id,m] of Object.entries(MAPS)){
  if(!m.entry) continue;
  const t = m.tiles[m.entry.y]?.[m.entry.x];
  if(t===undefined || !WALKABLE.has(t)) err(`${id}: entry (${m.entry.x},${m.entry.y}) tile '${t}' not walkable`);
}

// ---- 4. BFS到達チェック（町・ダンジョン内: entry → 全オブジェクト・全NPC・出口） ----
function bfs(map, sx, sy, extraPass){
  const h = map.tiles.length, w = map.tiles[0].length;
  const seen = Array.from({length:h},()=>new Array(w).fill(false));
  const q = [[sx,sy]];
  seen[sy][sx] = true;
  while(q.length){
    const [x,y] = q.shift();
    for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]]){
      const nx=x+dx, ny=y+dy;
      if(nx<0||ny<0||nx>=w||ny>=h||seen[ny][nx]) continue;
      const t = map.tiles[ny][nx];
      if(!(WALKABLE.has(t) || (extraPass && extraPass.includes(t)))) continue;
      seen[ny][nx] = true;
      q.push([nx,ny]);
    }
  }
  return seen;
}
// 隣接到達（宝箱・ボス・NPCは「隣まで行ければ」OK）
function adjacentReached(seen, x, y){
  return [[0,1],[0,-1],[1,0],[-1,0]].some(([dx,dy])=>seen[y+dy]?.[x+dx]);
}
for(const [id,m] of Object.entries(MAPS)){
  if(id==='world' || !m.entry) continue;
  const seen = bfs(m, m.entry.x, m.entry.y);
  for(const o of (m.objects||[])){
    if(!adjacentReached(seen, o.x, o.y)) err(`${id}: object ${o.id} at (${o.x},${o.y}) unreachable`);
  }
  for(const n of (m.npcs||[])){
    if(!adjacentReached(seen, n.x, n.y)) err(`${id}: npc '${n.emoji}' at (${n.x},${n.y}) unreachable`);
  }
  // 出口
  let exitOk = false;
  m.tiles.forEach((row,y)=>[...row].forEach((ch,x)=>{ if(ch==='>' && seen[y][x]) exitOk = true; }));
  if(!exitOk) err(`${id}: exit '>' unreachable from entry`);
}

// ---- 5. ワールドBFS: 徒歩（リオン前から）----
const wm = MAPS.world;
const start = MAPS.rion.exitTo;
const seenFoot = bfs(wm, start.x, start.y);
const FOOT_REQUIRED = ['1','2','3','c','f'];  // 船なしで行けるべき入口
for(const ch of FOOT_REQUIRED){
  const [x,y] = found[ch].split(',').map(Number);
  if(!seenFoot[y][x]) err(`world(foot): entrance '${ch}' (${ENTRANCES[ch]}) unreachable from rion`);
}
// 船なしで行けてはいけない場所
for(const ch of ['4','5','6','p','v','i','h','X']){
  const [x,y] = found[ch].split(',').map(Number);
  if(seenFoot[y][x]) warn(`world(foot): entrance '${ch}' (${ENTRANCES[ch]}) reachable WITHOUT ship!?`);
}

// ---- 6. ワールドBFS: 船あり（水も歩ける、クラーケン撃破後、ゲート開放後）----
const seenShip = bfs(wm, start.x, start.y, '~g');
for(const ch of Object.keys(ENTRANCES)){
  const [x,y] = found[ch].split(',').map(Number);
  if(!seenShip[y][x]) err(`world(ship): entrance '${ch}' (${ENTRANCES[ch]}) unreachable`);
}
// ---- 7. ゲートがないと暗黒城に行けないか ----
{
  const seenNoGate = bfs(wm, start.x, start.y, '~'); // gは通れない
  const [x,y] = found['X'].split(',').map(Number);
  if(seenNoGate[y][x]) err(`world: darkcastle reachable WITHOUT opening gate!?`);
}

// ---- 8. データ参照整合 ----
for(const [sid, stock] of Object.entries(SHOPS)){
  for(const id of stock) if(!ITEMS[id]) err(`shop ${sid}: unknown item '${id}'`);
}
for(const [tid, groups] of Object.entries(ENC_TABLES)){
  for(const g of groups) for(const mid of g) if(!MONSTERS[mid]) err(`enc ${tid}: unknown monster '${mid}'`);
}
for(const rule of WORLD_ENC){
  if(rule.table && !ENC_TABLES[rule.table]) err(`WORLD_ENC: unknown table '${rule.table}'`);
}
for(const [id,m] of Object.entries(MAPS)){
  if(m.enc && !ENC_TABLES[m.enc.table]) err(`${id}: unknown enc table '${m.enc.table}'`);
  for(const o of (m.objects||[])){
    if(o.type==='boss' && !MONSTERS[o.monster]) err(`${id}: unknown boss monster '${o.monster}'`);
    if(o.type==='chest' && o.item && !ITEMS[o.item]) err(`${id}: unknown chest item '${o.item}'`);
    if(o.reward && o.reward.item && !ITEMS[o.reward.item]) err(`${id}: unknown reward item '${o.reward.item}'`);
  }
  for(const n of (m.npcs||[])){
    if(n.shop && !SHOPS[n.shop]) err(`${id}: unknown shop '${n.shop}'`);
  }
}
for(const [cid,c] of Object.entries(CLASSES)){
  for(const sp of c.start) if(!SPELLS[sp]) err(`class ${cid}: unknown start spell '${sp}'`);
  for(const [lv,sp] of Object.entries(c.learn)){
    if(!SPELLS[sp]) err(`class ${cid}: unknown learn spell '${sp}'`);
    if(+lv > MAX_LV) err(`class ${cid}: learn level ${lv} > MAX_LV`);
  }
  if(c.levels.length !== MAX_LV+1) err(`class ${cid}: levels length ${c.levels.length}`);
}
if(EXP_TABLE.length !== MAX_LV+1) err(`EXP_TABLE length ${EXP_TABLE.length} != ${MAX_LV+1}`);
for(let i=2;i<=MAX_LV;i++) if(EXP_TABLE[i]<=EXP_TABLE[i-1]) err(`EXP_TABLE not increasing at lv${i}`);
// モンスター変身先
for(const [mid,m] of Object.entries(MONSTERS)){
  if(m.next && !MONSTERS[m.next]) err(`monster ${mid}: unknown next '${m.next}'`);
  if(m.acts){
    const tw = m.acts.reduce((s,a)=>s+a.w,0);
    if(tw<=0) err(`monster ${mid}: acts weight 0`);
  }
}

// ---- 結果 ----
console.log('=== validate.js ===');
if(errors.length===0) console.log('OK: no errors');
else { console.log(`ERRORS (${errors.length}):`); errors.forEach(e=>console.log('  ✗ ' + e)); }
if(warns.length){ console.log(`WARNINGS (${warns.length}):`); warns.forEach(w=>console.log('  ! ' + w)); }
process.exit(errors.length ? 1 : 0);
