// ============================================================
// assets.js — 画像プリロード＆描画ヘルパー
// 【プレースホルダ運用】新規キャラ・新ボスは前作画像を仮使用。
//   差し替えは PARTY_IMG / MON_IMG / BATTLE_BG_IMG を直すだけでOK。
// ============================================================
'use strict';

const IMG = {};
let assetsReady = false;
let assetProgress = 0;

const ASSET_NAMES = [
  // モンスター
  'slime','rat','bat','goblin','skeleton','worm','orc','mage','bee',
  'madflower','darkelf','trent','wolf','ghost','fgolem','demon','dknight','dragon',
  // 前作ボス（記憶の祭壇で再戦）
  'gaiaworm','grantree','glacies','zarba','zarba2',
  // キャラ
  'hero_front','hero_back','hero_side','elder','oldwoman','boy','woman','merchant','guard',
  // アイコン
  'chest','cottage','castle','cave','shrine','tower','anchor','gate','crystal',
  // 背景
  'bg_grassland','bg_cave','bg_forest','bg_ice','bg_castle',
  // ロゴ
  'logo',
  // 地形タイル
  'grass','tallgrass','forest','water','mountain','snow','bridge','dirt',
  'floor_cave','wall_cave','floor_temple','wall_temple','floor_tower','wall_tower','floor_castle','wall_castle',
  // 町＆城タイル
  'wall_house','wall_window','roof_red','roof_blue','door','cobble','stairs','wall_brick',
  'sand','dock','carpet','marble','wall_torch','wall_banner','grass_flower','plaza',
];

// ★将来追加する画像（assets/ にPNGを置くだけで自動的に使われる。
//   無ければ既存画像でフォールバック。発注リストは tools/image-requests.md）
const FUTURE_ASSETS = [
  // 仲間3ポーズ
  'garde_front','garde_back','garde_side',
  'mira_front','mira_back','mira_side',
  'sena_front','sena_back','sena_side',
  // 新ボス
  'goblinlord','eldertrent','kraken','pharaoh','ignis','reiga','darkgeneral','noir','noir2',
  // 新モンスター
  'kingslime','seaserpent','merman','scorpion','mummy','sandgolem',
  'flamewolf','lavagolem','firebird','icedevil','snowghost','hellhound','archdemon','blackdragon','darkmage',
  // NPC
  'king','sister',
  // タイル
  'floor_pyramid','wall_pyramid','floor_volcano','wall_volcano','floor_altar','wall_altar','lava',
  // その他
  'ship','logo2',
  // 戦闘背景
  'bg_desert','bg_volcano','bg_sea','bg_dark',
];
ASSET_NAMES.push(...FUTURE_ASSETS);

// 候補リストから読み込み済みの最初の画像名を返す
function pickOk(cands){
  for(const n of cands) if(imgOk(n)) return n;
  return null;
}

// ダンジョンごとの床・壁タイル（候補の先頭から、読み込めた画像を使う）
const DUNGEON_TEX = {
  cave1:   {floor:['floor_cave'],   wall:['wall_cave']},
  ruins:   {floor:['floor_temple'], wall:['wall_temple']},
  pyramid: {floor:['floor_pyramid','sand'],        wall:['wall_pyramid','wall_temple']},
  volcano: {floor:['floor_volcano','floor_cave'],  wall:['wall_volcano','wall_cave']},
  icetemple:{floor:['floor_tower'], wall:['wall_tower']},
  altar:   {floor:['floor_altar','marble'],        wall:['wall_altar','wall_temple']},
  darkcastle:{floor:['floor_castle'], wall:['wall_castle']},
};

// モンスターキー → 仮画像（キーと同名のPNGが assets/ にあればそちらを優先）
const MON_IMG = {
  nightbat:'bat',
  kingslime:'slime',
  seaserpent:'worm',
  merman:'goblin',
  kraken:'madflower',
  scorpion:'bee',
  mummy:'skeleton',
  sandgolem:'fgolem',
  pharaoh:'dknight',
  flamewolf:'wolf',
  lavagolem:'fgolem',
  firebird:'bat',
  ignis:'dragon',
  icedevil:'demon',
  snowghost:'ghost',
  reiga:'fgolem',
  goblinlord:'goblin',
  eldertrent:'grantree',
  darkgeneral:'dknight',
  darkmage:'mage',
  hellhound:'wolf',
  archdemon:'demon',
  blackdragon:'dragon',
  noir:'demon',
  noir2:'zarba2',
};
function monImg(key){
  if(imgOk(key)) return key;          // 専用画像があれば最優先
  return MON_IMG[key] || key;
}

// パーティキャラ → 画像（専用3ポーズがあれば優先、なければ仮画像）
const PARTY_IMG = {
  ryuka: {front:['hero_front'], back:['hero_back'], side:['hero_side']},
  garde: {front:['garde_front','guard'], back:['garde_back'], side:['garde_side']},
  mira:  {front:['mira_front','mage'],   back:['mira_back'],  side:['mira_side']},
  sena:  {front:['sena_front','woman'],  back:['sena_back'],  side:['sena_side']},
};

// NPC絵文字 → 画像名（候補の先頭優先）
const NPC_IMG = {
  '👴':['elder'], '👵':['oldwoman'], '🧒':['boy'],
  '👩':['woman'], '👨':['merchant'], '💂':['guard'],
  '👑':['king','elder'],
  '⛪':['sister','woman'],
  '🧙':['mage'],
  '🦸':['hero_front'],
};
function npcImg(emoji){
  const cands = NPC_IMG[emoji];
  return cands ? pickOk(cands) : null;
}

// ワールド入口タイル → アイコン画像名
const TILE_IMG = {
  '1':'cottage', '2':'castle', '3':'anchor', '4':'cottage', '5':'cottage', '6':'shrine',
  'c':'cave', 'f':'shrine', 'p':'tower', 'v':'cave', 'i':'tower', 'h':'shrine', 'D':'castle',
};

// 戦闘背景: マップ → 画像名候補（先頭優先）
const BATTLE_BG_IMG = {
  world:['bg_grassland'],
  sea:['bg_sea','bg_grassland'],
  cave1:['bg_cave'],
  ruins:['bg_forest'],
  pyramid:['bg_desert','bg_cave'],
  volcano:['bg_volcano','bg_cave'],
  icetemple:['bg_ice'],
  altar:['bg_dark','bg_castle'],
  darkcastle:['bg_dark','bg_castle'],
  marina:['bg_sea','bg_grassland'],
};

function loadAssets(done){
  let loaded = 0;
  const total = ASSET_NAMES.length;
  if(total===0){ assetsReady = true; done(); return; }
  for(const name of ASSET_NAMES){
    const im = new Image();
    im.onload = im.onerror = ()=>{
      loaded++;
      assetProgress = loaded/total;
      if(loaded===total){ assetsReady = true; done(); }
    };
    im.src = 'assets/' + name + '.png';
    IMG[name] = im;
  }
}

function imgOk(name){
  const im = IMG[name];
  return im && im.complete && im.naturalWidth > 0;
}

// 足元(cx,bottomY)を基準に、高さtargetHで描画（フィールドのキャラ・モンスター）
function drawSpriteBottom(name, cx, bottomY, targetH, flip){
  if(!imgOk(name)) return false;
  const im = IMG[name];
  const s = targetH / im.naturalHeight;
  const w = im.naturalWidth * s, h = targetH;
  const ctx2 = ctx;
  ctx2.save();
  ctx2.imageSmoothingEnabled = false;
  if(flip){
    ctx2.translate(cx, 0); ctx2.scale(-1,1);
    ctx2.drawImage(im, -w/2, bottomY-h, w, h);
  } else {
    ctx2.drawImage(im, cx-w/2, bottomY-h, w, h);
  }
  ctx2.restore();
  return true;
}

// 中心(cx,cy)基準、最大辺boxに収めて描画（バトルのモンスター等）
function drawSpriteCenter(name, cx, cy, targetH){
  if(!imgOk(name)) return false;
  const im = IMG[name];
  const s = targetH / im.naturalHeight;
  const w = im.naturalWidth * s, h = targetH;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(im, cx-w/2, cy-h/2, w, h);
  ctx.restore();
  return true;
}

// 地面タイルを TS×TS で敷く。allowFlipなら(x,y)で左右反転して繰り返し感を抑える
function drawGround(name, sx, sy, x, y, allowFlip){
  if(!imgOk(name)) return false;
  const im = IMG[name];
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  if(allowFlip && (((x*3+y) & 1) === 0)){
    ctx.translate(sx+TS, sy); ctx.scale(-1,1);
    ctx.drawImage(im, 0, 0, TS, TS);
  } else {
    ctx.drawImage(im, sx, sy, TS, TS);
  }
  ctx.restore();
  return true;
}

// box(正方)内にフィットさせ中心(cx,cy)描画（タイルアイコン）
function drawIconFit(name, cx, cy, box){
  if(!imgOk(name)) return false;
  const im = IMG[name];
  const s = box / Math.max(im.naturalWidth, im.naturalHeight);
  const w = im.naturalWidth*s, h = im.naturalHeight*s;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(im, cx-w/2, cy-h/2, w, h);
  ctx.restore();
  return true;
}

// パーティキャラ描画（dir対応・ポーズ画像が無ければfrontで代用）
function drawPartyChar(charId, dir, cx, bottomY, targetH){
  const pi = PARTY_IMG[charId];
  if(!pi) return false;
  let name = null, flip = false;
  if(dir==='up') name = pickOk(pi.back);
  else if(dir==='left' || dir==='right'){
    name = pickOk(pi.side);
    flip = (dir==='right');   // side素材は左向きが基準
  }
  if(!name){ name = pickOk(pi.front); flip = false; }
  if(!name) return false;
  return drawSpriteBottom(name, cx, bottomY, targetH, flip);
}
