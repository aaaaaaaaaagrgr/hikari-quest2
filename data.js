// ============================================================
// data.js — ゲームデータ（職業・呪文・アイテム・モンスター・マップ・NPC）
// ヒカリの伝説II 〜よみがえる闇〜
// ============================================================
'use strict';

const MAX_LV = 30;

// ---------------- 経験値テーブル (index = level, 累積) ----------------
const EXP_TABLE = [null, 0,
  7, 20, 45, 90, 160, 260, 400, 590, 840,
  1160, 1560, 2050, 2640, 3340, 4200, 5220, 6420, 7840, 9520,
  11500, 13830, 16560, 19750, 23470, 27800, 32830, 38660, 45400, 53180,
];

// ---------------- 職業（パーティメンバー） ----------------
function genGrowth(c){
  const t = [null];
  for(let lv=1; lv<=MAX_LV; lv++){
    const n = lv-1;
    t.push({
      hp:  Math.round(c.hp0 + c.hpG*n + c.hpC*n*n),
      mp:  Math.round(c.mp0 + c.mpG*n + c.mpC*n*n),
      str: Math.round(c.st0 + c.stG*n + c.stC*n*n),
      agi: Math.round(c.ag0 + c.agG*n + c.agC*n*n),
    });
  }
  return t;
}

const CLASSES = {
  ryuka: {
    defName:'リュカ', role:'ゆうしゃ', img:'ryuka',
    levels: genGrowth({hp0:20,hpG:8.5,hpC:0.12, mp0:2,mpG:4.5,mpC:0.03, st0:7,stG:2.2,stC:0.02, ag0:6,agG:1.7,agC:0.01}),
    start:[], learn:{3:'heal', 6:'spark', 8:'ret', 12:'healra', 16:'thunder', 20:'gigaspark', 26:'gigathunder'},
  },
  garde: {
    defName:'ガルド', role:'せんし', img:'garde',
    levels: genGrowth({hp0:26,hpG:10.5,hpC:0.10, mp0:0,mpG:0,mpC:0, st0:9,stG:2.8,stC:0.025, ag0:5,agG:1.1,agC:0}),
    start:[], learn:{},
  },
  mira: {
    defName:'ミラ', role:'まほうつかい', img:'mira',
    levels: genGrowth({hp0:14,hpG:5.5,hpC:0.06, mp0:8,mpG:7,mpC:0.06, st0:4,stG:1.1,stC:0, ag0:7,agG:1.9,agC:0.01}),
    start:['fire'], learn:{7:'icebolt', 9:'sleep', 11:'fira', 13:'lucanan', 15:'blizzard', 18:'bikilt', 21:'megafire', 25:'meteo'},
  },
  sena: {
    defName:'セナ', role:'そうりょ', img:'sena',
    levels: genGrowth({hp0:17,hpG:6.5,hpC:0.08, mp0:6,mpG:6,mpC:0.05, st0:5,stG:1.5,stC:0.005, ag0:6,agG:1.6,agC:0.005}),
    start:['heal','cure'], learn:{10:'wind', 12:'skult', 14:'healra', 17:'rezarek', 20:'healall', 24:'fullheal', 27:'healallra'},
  },
};

// ---------------- 呪文 ----------------
// t: dmg(単体)/dmgall/heal/healall/fullheal/sleep/cure/revive/return/defup/atkup/defdown
const SPELLS = {
  fire:      {name:'ファイア',     mp:2,  t:'dmg',    min:8,  max:16, elem:'fire'},
  heal:      {name:'ヒール',       mp:3,  t:'heal',   min:25, max:35, field:true},
  cure:      {name:'キュア',       mp:2,  t:'cure',   field:true},
  spark:     {name:'スパーク',     mp:3,  t:'dmg',    min:16, max:24},
  sleep:     {name:'スリプル',     mp:3,  t:'sleep'},
  ret:       {name:'リターン',     mp:6,  t:'return', field:true},
  icebolt:   {name:'アイスボルト', mp:4,  t:'dmg',    min:22, max:32, elem:'ice'},
  wind:      {name:'ウィンド',     mp:4,  t:'dmg',    min:22, max:34},
  fira:      {name:'ファイラ',     mp:5,  t:'dmg',    min:30, max:46, elem:'fire'},
  healra:    {name:'ヒーラ',       mp:6,  t:'heal',   min:75, max:95, field:true},
  skult:     {name:'スクルト',     mp:4,  t:'defup'},
  lucanan:   {name:'ルカナン',     mp:4,  t:'defdown'},
  bikilt:    {name:'バイキルト',   mp:6,  t:'atkup'},
  thunder:   {name:'サンダー',     mp:8,  t:'dmgall', min:35, max:50},
  blizzard:  {name:'ブリザド',     mp:8,  t:'dmgall', min:32, max:46, elem:'ice'},
  rezarek:   {name:'リザレク',     mp:10, t:'revive', field:true},
  gigaspark: {name:'ギガスパーク', mp:10, t:'dmg',    min:95, max:135},
  healall:   {name:'ヒールオール', mp:10, t:'healall', min:60, max:80, field:true},
  megafire:  {name:'メガファイア', mp:12, t:'dmg',    min:80, max:115, elem:'fire'},
  fullheal:  {name:'フルヒール',   mp:12, t:'fullheal', field:true},
  gigathunder:{name:'ギガサンダー',mp:15, t:'dmgall', min:70, max:95},
  meteo:     {name:'メテオ',       mp:18, t:'dmgall', min:85, max:120},
  healallra: {name:'メガヒールオール', mp:18, t:'healall', min:110, max:140, field:true},
};

// ---------------- アイテム・装備 ----------------
// eq: 装備できるメンバーid（省略=全員）
const ITEMS = {
  herb:     {name:'やくそう',       type:'tool', price:8,   t:'heal', min:30, max:40},
  hherb:    {name:'いやしそう',     type:'tool', price:40,  t:'heal', min:85, max:105},
  antidote: {name:'どくけしそう',   type:'tool', price:12,  t:'cure'},
  mwater:   {name:'まほうのみず',   type:'tool', price:90,  t:'mp', amt:30},
  mwater2:  {name:'まほうのせいすい',type:'tool', price:300, t:'mp', amt:90},
  wing:     {name:'かえりのつばさ', type:'tool', price:60,  t:'return'},
  lifeorb:  {name:'ふっかつのたま', type:'tool', price:600, t:'revive'},
  seedstr:  {name:'ちからのたね',   type:'tool', price:0,   t:'seed', stat:'str', amt:3},
  seeddef:  {name:'まもりのたね',   type:'tool', price:0,   t:'seed', stat:'def', amt:4},
  seedagi:  {name:'すばやさのたね', type:'tool', price:0,   t:'seed', stat:'agi', amt:5},

  w_stick:   {name:'ひのきのぼう',   type:'weapon', price:10,   pow:2},
  w_dagger:  {name:'ダガー',         type:'weapon', price:60,   pow:5},
  w_copper:  {name:'どうのつるぎ',   type:'weapon', price:120,  pow:8,  eq:['ryuka','garde']},
  w_oakrod:  {name:'カシのつえ',     type:'weapon', price:90,   pow:6,  eq:['mira','sena']},
  w_iron:    {name:'てつのつるぎ',   type:'weapon', price:380,  pow:14, eq:['ryuka','garde']},
  w_silverrod:{name:'ぎんのロッド',  type:'weapon', price:320,  pow:11, eq:['mira','sena']},
  w_steel:   {name:'はがねのつるぎ', type:'weapon', price:950,  pow:21, eq:['ryuka','garde']},
  w_axe:     {name:'バトルアックス', type:'weapon', price:1300, pow:26, eq:['garde']},
  w_windrod: {name:'かぜのつえ',     type:'weapon', price:850,  pow:16, eq:['mira','sena']},
  w_flame:   {name:'ほのおのつるぎ', type:'weapon', price:2600, pow:31, eq:['ryuka','garde']},
  w_staragi: {name:'ほしのつえ',     type:'weapon', price:2300, pow:23, eq:['mira','sena']},
  w_dragon:  {name:'ドラゴンキラー', type:'weapon', price:5800, pow:39, eq:['ryuka','garde']},
  w_greataxe:{name:'ギガントアックス',type:'weapon', price:6600, pow:44, eq:['garde']},
  w_moonrod: {name:'つきのつえ',     type:'weapon', price:5200, pow:29, eq:['mira','sena']},
  w_hero:    {name:'ゆうしゃのつるぎ',type:'weapon', price:0,    pow:50, eq:['ryuka']},
  w_ruin:    {name:'はかいのおおおの',type:'weapon', price:0,    pow:52, eq:['garde']},
  w_sage:    {name:'けんじゃのつえ', type:'weapon', price:0,    pow:38, eq:['mira','sena']},

  a_cloth:   {name:'ぬののふく',     type:'armor', price:15,   pow:2},
  a_leather: {name:'かわのよろい',   type:'armor', price:110,  pow:6},
  a_chain:   {name:'くさりかたびら', type:'armor', price:420,  pow:11, eq:['ryuka','garde']},
  a_robe:    {name:'まほうのローブ', type:'armor', price:380,  pow:9,  eq:['mira','sena']},
  a_steel:   {name:'はがねのよろい', type:'armor', price:1050, pow:17, eq:['ryuka','garde']},
  a_silkrobe:{name:'ぎんのローブ',   type:'armor', price:950,  pow:13, eq:['mira','sena']},
  a_flame:   {name:'ほのおのよろい', type:'armor', price:2900, pow:24, eq:['ryuka','garde']},
  a_feather: {name:'てんしのローブ', type:'armor', price:2500, pow:18, eq:['mira','sena']},
  a_dragon:  {name:'りゅうのよろい', type:'armor', price:6200, pow:32, eq:['ryuka','garde']},
  a_moonrobe:{name:'つきのローブ',   type:'armor', price:5400, pow:25, eq:['mira','sena']},
  a_light:   {name:'ひかりのよろい', type:'armor', price:0,    pow:42, eq:['ryuka']},
  a_dark:    {name:'ダークメイル',   type:'armor', price:0,    pow:38, eq:['garde']},

  s_leather: {name:'かわのたて',     type:'shield', price:60,   pow:3},
  s_iron:    {name:'てつのたて',     type:'shield', price:380,  pow:7,  eq:['ryuka','garde']},
  s_steel:   {name:'はがねのたて',   type:'shield', price:1250, pow:12, eq:['ryuka','garde']},
  s_magic:   {name:'まほうのたて',   type:'shield', price:1600, pow:10},
  s_dragon:  {name:'りゅうのたて',   type:'shield', price:5600, pow:18, eq:['ryuka','garde']},
  s_light:   {name:'ひかりのたて',   type:'shield', price:0,    pow:25, eq:['ryuka']},
};

const SHOPS = {
  rion:    ['w_stick','w_dagger','w_copper','a_cloth','a_leather','s_leather','herb','antidote'],
  grandia: ['w_iron','w_silverrod','w_oakrod','a_chain','a_robe','s_iron','herb','antidote','mwater','wing'],
  marina:  ['w_steel','w_windrod','a_steel','a_silkrobe','s_iron','herb','hherb','mwater','wing'],
  sandra:  ['w_flame','w_axe','w_staragi','a_flame','a_feather','s_steel','hherb','antidote','mwater','lifeorb'],
  fubuki:  ['w_dragon','w_moonrod','a_dragon','a_moonrobe','s_magic','hherb','mwater2','lifeorb','wing'],
  elf:     ['w_greataxe','s_dragon','hherb','mwater2','lifeorb'],
};

// ---------------- モンスター ----------------
// acts: {w, t:'atk'|'strong'|'double'|'spell'|'spellall'|'breath'|'sleep'|'poison'}
// breath / spellall / sleep は パーティ全体対象
const MONSTERS = {
  // --- 序盤（リオン周辺・ひびきの洞窟）---
  slime:    {name:'スライム',       emoji:'👾', hp:8,  atk:10, def:3,  agi:3,  exp:3,  gold:4},
  rat:      {name:'おおねずみ',     emoji:'🐀', hp:12, atk:12, def:4,  agi:5,  exp:5,  gold:6},
  bat:      {name:'おおこうもり',   emoji:'🦇', hp:10, atk:11, def:2,  agi:8,  exp:4,  gold:5},
  goblin:   {name:'ゴブリン',       emoji:'👺', hp:18, atk:14, def:6,  agi:6,  exp:9,  gold:12},
  bee:      {name:'どくバチ',       emoji:'🐝', hp:16, atk:16, def:4,  agi:12, exp:10, gold:10,
             acts:[{w:70,t:'atk'},{w:30,t:'poison',name:'どくばり',min:6,max:10}]},
  worm:     {name:'マッドワーム',   emoji:'🪱', hp:26, atk:16, def:8,  agi:4,  exp:12, gold:13},
  skeleton: {name:'がいこつへい',   emoji:'💀', hp:30, atk:19, def:9,  agi:7,  exp:16, gold:18},
  kingslime:{name:'キングスライム', emoji:'👾', hp:60, atk:22, def:14, agi:5,  exp:35, gold:40,
             acts:[{w:70,t:'atk'},{w:30,t:'strong',mul:1.4,msg:'おもいきり のしかかった！'}]},
  // --- 中盤A（王都周辺・森の遺跡）---
  orc:      {name:'オーク',         emoji:'🐗', hp:42, atk:25, def:12, agi:8,  exp:22, gold:26},
  mage:     {name:'まどうし',       emoji:'🧙', hp:30, atk:19, def:8,  agi:10, exp:24, gold:32,
             acts:[{w:55,t:'atk'},{w:45,t:'spell',name:'ファイア',min:10,max:16}]},
  nightbat: {name:'ナイトバット',   emoji:'🦇', hp:26, atk:22, def:6,  agi:14, exp:16, gold:18},
  madflower:{name:'マッドフラワー', emoji:'🌺', hp:38, atk:25, def:12, agi:8,  exp:28, gold:34, fireWeak:true,
             acts:[{w:65,t:'atk'},{w:35,t:'sleep',name:'ねむりのこな'}]},
  darkelf:  {name:'ダークエルフ',   emoji:'🧝', hp:46, atk:30, def:14, agi:16, exp:38, gold:48,
             acts:[{w:60,t:'atk'},{w:40,t:'spell',name:'ファイラ',min:20,max:30}]},
  trent:    {name:'トレント',       emoji:'🌳', hp:60, atk:32, def:18, agi:6,  exp:44, gold:46, fireWeak:true},
  ghost:    {name:'ゴースト',       emoji:'👻', hp:34, atk:27, def:10, agi:18, exp:30, gold:30,
             acts:[{w:60,t:'atk'},{w:40,t:'spell',name:'やみのいき',min:14,max:20}]},
  // --- 海 ---
  seaserpent:{name:'シーサーペント',emoji:'🐍', hp:55, atk:36, def:16, agi:12, exp:50, gold:55},
  merman:   {name:'マーマン',       emoji:'🧜', hp:48, atk:34, def:18, agi:14, exp:46, gold:52},
  // --- 砂漠・ピラミッド ---
  scorpion: {name:'デススコーピオン',emoji:'🦂', hp:60, atk:42, def:24, agi:16, exp:60, gold:60,
             acts:[{w:65,t:'atk'},{w:35,t:'poison',name:'どくのしっぽ',min:12,max:18}]},
  mummy:    {name:'ミイラおとこ',   emoji:'🧟', hp:70, atk:44, def:20, agi:10, exp:70, gold:68,
             acts:[{w:70,t:'atk'},{w:30,t:'sleep',name:'のろいのほうたい'}]},
  sandgolem:{name:'サンドゴーレム', emoji:'🗿', hp:90, atk:47, def:28, agi:6,  exp:82, gold:75},
  darkmage: {name:'くろまどうし',   emoji:'🧙', hp:55, atk:36, def:16, agi:14, exp:76, gold:92,
             acts:[{w:50,t:'atk'},{w:50,t:'spell',name:'ファイラ',min:22,max:32}]},
  // --- 火山 ---
  flamewolf:{name:'フレイムウルフ', emoji:'🐺', hp:85, atk:56, def:26, agi:24, exp:110, gold:95, iceWeak:true},
  lavagolem:{name:'ラヴァゴーレム', emoji:'🗿', hp:130, atk:62, def:36, agi:8,  exp:140, gold:110, iceWeak:true},
  firebird: {name:'ヒノトリ',       emoji:'🐦', hp:75, atk:52, def:22, agi:28, exp:105, gold:90, iceWeak:true,
             acts:[{w:65,t:'atk'},{w:35,t:'breath',name:'かえんのいき',min:16,max:24}]},
  dragon:   {name:'ドラゴン',       emoji:'🐉', hp:120, atk:60, def:30, agi:18, exp:145, gold:130,
             acts:[{w:60,t:'atk'},{w:40,t:'breath',name:'かえんのいき',min:24,max:34}]},
  demon:    {name:'デーモン',       emoji:'😈', hp:95, atk:58, def:28, agi:20, exp:130, gold:120,
             acts:[{w:60,t:'atk'},{w:40,t:'spell',name:'ダークボール',min:30,max:42}]},
  // --- 雪原・氷の神殿 ---
  wolf:     {name:'スノーウルフ',   emoji:'🐺', hp:100, atk:64, def:30, agi:30, exp:150, gold:120},
  snowghost:{name:'ブリザードゴースト',emoji:'👻', hp:90, atk:60, def:26, agi:26, exp:145, gold:125,
             acts:[{w:55,t:'atk'},{w:45,t:'spell',name:'アイスボルト',min:26,max:36}]},
  fgolem:   {name:'フロストゴーレム',emoji:'🗿', hp:150, atk:70, def:40, agi:10, exp:180, gold:150},
  icedevil: {name:'アイスデーモン', emoji:'😈', hp:110, atk:68, def:32, agi:24, exp:175, gold:160,
             acts:[{w:65,t:'atk'},{w:35,t:'breath',name:'こおりのいき',min:20,max:28}]},
  // --- 暗黒城 ---
  hellhound:{name:'ヘルハウンド',   emoji:'🐺', hp:130, atk:78, def:36, agi:32, exp:230, gold:180,
             acts:[{w:70,t:'atk'},{w:30,t:'double'}]},
  archdemon:{name:'アークデーモン', emoji:'😈', hp:150, atk:82, def:40, agi:26, exp:260, gold:220,
             acts:[{w:55,t:'atk'},{w:45,t:'spell',name:'ダークフレア',min:36,max:48}]},
  dknight:  {name:'ダークナイト',   emoji:'🤺', hp:170, atk:88, def:46, agi:28, exp:290, gold:250,
             acts:[{w:70,t:'atk'},{w:30,t:'strong',mul:1.4,msg:'ざんこくな いちげきを はなった！'}]},
  blackdragon:{name:'ブラックドラゴン',emoji:'🐉', hp:210, atk:92, def:42, agi:22, exp:340, gold:300,
             acts:[{w:60,t:'atk'},{w:40,t:'breath',name:'やみのほのお',min:36,max:48}]},

  // ============ ボス ============
  goblinlord:{name:'ゴブリンロード', emoji:'👺', hp:180, atk:29, def:10, agi:8, exp:120, gold:250, boss:true,
             acts:[{w:55,t:'atk'},{w:30,t:'strong',mul:1.5,msg:'おおきな こんぼうを ふりおろした！'},{w:15,t:'double'}]},
  eldertrent:{name:'たいじゅ エルダートレント', emoji:'🌲', hp:430, atk:44, def:20, agi:8, exp:450, gold:520, boss:true, fireWeak:true,
             acts:[{w:45,t:'atk'},{w:25,t:'sleep',name:'ねむりのこな'},{w:30,t:'strong',mul:1.4,msg:'ふとい えだを ふりおろした！'}]},
  kraken:   {name:'かいま クラーケン', emoji:'🐙', hp:680, atk:50, def:20, agi:12, exp:650, gold:700, boss:true,
             acts:[{w:40,t:'atk'},{w:35,t:'double'},{w:25,t:'strong',mul:1.5,msg:'きょだいな あしを たたきつけた！'}]},
  pharaoh:  {name:'おうけのぼうれい ファラオ', emoji:'👻', hp:900, atk:62, def:28, agi:16, exp:1100, gold:1100, boss:true,
             acts:[{w:35,t:'atk'},{w:30,t:'spell',name:'ダークボール',min:34,max:46},{w:20,t:'double'},{w:15,t:'sleep',name:'のろいのすな'}]},
  ignis:    {name:'えんりゅう イグニス', emoji:'🐉', hp:1100, atk:74, def:32, agi:18, exp:1900, gold:1600, boss:true, iceWeak:true,
             acts:[{w:30,t:'atk'},{w:40,t:'breath',name:'ごうかのいき',min:32,max:44},{w:30,t:'strong',mul:1.4,msg:'もえさかる ツメで きりさいた！'}]},
  reiga:    {name:'ひょうしょう レイガ', emoji:'🗿', hp:1550, atk:88, def:38, agi:20, exp:2800, gold:2300, boss:true,
             acts:[{w:30,t:'atk'},{w:35,t:'breath',name:'ぜったいれいどのいき',min:44,max:58},{w:20,t:'double'},{w:15,t:'strong',mul:1.4,msg:'こおりの おおなぎなたを ふるった！'}]},
  darkgeneral:{name:'まぐんしょう ザガン', emoji:'🤺', hp:1800, atk:102, def:45, agi:26, exp:3500, gold:3000, boss:true,
             acts:[{w:40,t:'atk'},{w:35,t:'strong',mul:1.5,msg:'じごくの けんを たたきつけた！'},{w:25,t:'double'}]},
  noir:     {name:'しんまおう ノワール', emoji:'👿', hp:1800, atk:108, def:48, agi:28, exp:0, gold:0, boss:true, next:'noir2',
             acts:[{w:30,t:'atk'},{w:35,t:'spell',name:'ダークネビュラ',min:50,max:66},{w:20,t:'strong',mul:1.3,msg:'やみの ちからを たたきつけた！'},{w:15,t:'sleep',name:'やみのこもりうた'}]},
  noir2:    {name:'めつぼうの ノワール', emoji:'🐲', hp:2400, atk:122, def:50, agi:32, exp:0, gold:0, boss:true,
             acts:[{w:25,t:'atk'},{w:40,t:'breath',name:'しゅうえんのほのお',min:55,max:72},{w:20,t:'double'},{w:15,t:'strong',mul:1.5,msg:'ぜつぼうの いちげきを はなった！'}]},
  // ============ 記憶の祭壇（前作ボス） ============
  m_gaiaworm:{name:'ついおくのガイアワーム', emoji:'🐛', hp:1100, atk:90, def:35, agi:14, exp:2000, gold:0, boss:true,
             acts:[{w:60,t:'atk'},{w:40,t:'strong',mul:1.5,msg:'おおきな あごで かみついた！'}]},
  m_grantree:{name:'ついおくのグランツリー', emoji:'🌲', hp:1500, atk:98, def:40, agi:16, exp:3000, gold:0, boss:true, fireWeak:true,
             acts:[{w:45,t:'atk'},{w:25,t:'sleep',name:'ねむりのこな'},{w:30,t:'strong',mul:1.4,msg:'ふとい えだを ふりおろした！'}]},
  m_glacies:{name:'ついおくのグラシエス', emoji:'⛄', hp:1800, atk:108, def:42, agi:22, exp:4000, gold:0, boss:true,
             acts:[{w:30,t:'atk'},{w:40,t:'breath',name:'こおりのいき',min:52,max:68},{w:30,t:'double'}]},
  m_zarba:  {name:'ついおくのまおう ザルバ', emoji:'👿', hp:1500, atk:115, def:46, agi:26, exp:0, gold:0, boss:true, next:'m_zarba2',
             acts:[{w:35,t:'atk'},{w:40,t:'spell',name:'ダークボール',min:55,max:70},{w:25,t:'strong',mul:1.3,msg:'やみの ちからを たたきつけた！'}]},
  m_zarba2: {name:'ついおくのしんのまおう', emoji:'🐲', hp:2800, atk:130, def:50, agi:30, exp:8000, gold:0, boss:true,
             acts:[{w:25,t:'atk'},{w:45,t:'breath',name:'やみのほのお',min:68,max:88},{w:30,t:'double'}]},
};

// メモリーボスの画像（前作ボス画像をそのまま使う）
MON_IMG.m_gaiaworm = 'gaiaworm';
MON_IMG.m_grantree = 'grantree';
MON_IMG.m_glacies  = 'glacies';
MON_IMG.m_zarba    = 'zarba';
MON_IMG.m_zarba2   = 'zarba2';

// ---------------- エンカウントテーブル ----------------
const ENC_TABLES = {
  field1:   [['slime'],['slime','slime'],['rat'],['bat'],['goblin'],['slime','bat'],['bee'],['goblin','rat']],
  cave1:    [['goblin'],['skeleton'],['worm'],['bat','bat'],['skeleton','worm'],['goblin','goblin'],['kingslime']],
  field2:   [['orc'],['mage'],['nightbat'],['bee','bee'],['orc','mage'],['madflower'],['nightbat','nightbat','bat']],
  forestA:  [['madflower'],['bee','bee'],['orc'],['darkelf'],['madflower','bee']],
  ruins:    [['ghost'],['darkelf'],['trent'],['ghost','darkelf'],['trent','madflower'],['darkelf','darkelf']],
  sea:      [['seaserpent'],['merman'],['merman','merman'],['seaserpent','merman'],['kingslime','kingslime']],
  desert:   [['scorpion'],['mummy'],['sandgolem'],['scorpion','scorpion'],['mummy','darkmage']],
  pyramid:  [['mummy'],['darkmage'],['sandgolem'],['mummy','mummy','darkmage'],['scorpion','sandgolem'],['darkmage','darkmage']],
  volcanoF: [['flamewolf'],['firebird'],['flamewolf','firebird']],
  volcano:  [['flamewolf'],['lavagolem'],['firebird','firebird'],['demon'],['dragon'],['demon','flamewolf'],['lavagolem','firebird']],
  snowF:    [['wolf'],['snowghost'],['wolf','wolf'],['snowghost','wolf']],
  icetemple:[['snowghost'],['fgolem'],['icedevil'],['wolf','wolf'],['icedevil','snowghost'],['fgolem','icedevil']],
  elfF:     [['trent'],['darkelf','darkelf'],['trent','darkelf']],
  darkisle: [['hellhound'],['archdemon'],['hellhound','hellhound']],
  darkcastle:[['hellhound'],['archdemon'],['dknight'],['blackdragon'],['archdemon','hellhound'],['dknight','archdemon'],['hellhound','hellhound','archdemon']],
};

// ワールドのエンカウント規則（上から順に判定）
// t:対象タイル, zone:[x1,y1,x2,y2], table:null=エンカウントなし
const WORLD_ENC = [
  {t:'.,F', zone:[2,14,7,19],   table:null},        // 記憶の祭壇の島（安全）
  {t:'d',   zone:[7,3,19,12],   table:'darkisle'},  // 暗黒城の島
  {t:'~',   table:'sea'},
  {t:'s',   table:'desert'},
  {t:'d',   table:'volcanoF'},
  {t:'S',   table:'snowF'},
  {t:'F',   zone:[49,14,57,20], table:'elfF'},      // エルフの島
  {t:'.,F', zone:[25,33,59,45], table:'field1'},    // 始まりの大陸・南部
  {t:'F',   table:'forestA'},
  {t:'.,',  table:'field2'},
];
// タイルごとのエンカウント率（1/n）
const ENC_RATE = {'.':15, ',':11, 'F':11, 's':13, 'S':13, '~':16, 'd':11};

// ---------------- マップ生成ヘルパー ----------------
function gridBlank(w,h,ch){ return Array.from({length:h},()=>ch.repeat(w)); }
function carve(g,x1,y1,x2,y2,ch='-'){
  for(let y=y1;y<=y2;y++){
    const r=g[y].split('');
    for(let x=x1;x<=x2;x++) r[x]=ch;
    g[y]=r.join('');
  }
}

// ---------------- ワールドマップ (60 x 46) ----------------
// 記号: ~水 .草 ,茂み F森 m山 S雪 s砂 d荒地 =橋 g門 L溶岩
// 入口: 1リオン村 2王都 3マリナ 4サンドラ 5フブキ 6エルフ
//       c洞窟 f遺跡 pピラミッド v火山 i氷神殿 h祭壇 X暗黒城
const WORLD_TILES = [
"~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~", // 0
"~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~", // 1
"~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~", // 2
"~~~~~~~~~~~~~~~~~~~~~~~~SSSSSSSSSSSSSSSSSSSSSSSSSSSS~~~~~~~~", // 3
"~~~~~~~~mmmmmmmmmmm~~~~~SSSSSSSSSSSSSSSSSSSSSSSSSSSS~~~~~~~~", // 4
"~~~~~~~~mdddddddddm~~~~~SSSSSSSSSSSSmmmSSSSSSSSSSSSS~~~~~~~~", // 5
"~~~~~~~~mddddXddddm~~~~~SSSSSSSSSSSSmmmSSSSmmismmSSS~~~~~~~~", // 6
"~~~~~~~~mdddddddddm~~~~~SSSSSSSSSSSSSSSSSSSmmSmmSSSS~~~~~~~~", // 7
"~~~~~~~~mdddddddddm~~~~~SSSSSSmmmmmSSSSSSSSSSSSSSSSS~~~~~~~~", // 8
"~~~~~~~~mdddddddddm~~~~~SSSS5SSSSSSSSSSSSSSSSSSSSSSS~~~~~~~~", // 9
"~~~~~~~~mdddddddddm~~~~~SSSSSSSSSSSSSSSSSSSSSSSSSSSS~~~~~~~~", // 10
"~~~~~~~~mmmmmgmmmmm~~~~~SSSSSSSSSSSSSSSSSSSSSSSSSSSS~~~~~~~~", // 11
"~~~~~~~~~~~~~~~~~~~~~~~~SSSSSSSSSSSSSSSSSSSSSSSSSSSS~~~~~~~~", // 12
"~~~~~~~~~~~~~~~~~~~~~~~~SSSSSSSSSSSSSSSSSSSSSSSSSSSS~~~~~~~~", // 13
"~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~", // 14
"~~~....~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~FFFFF~~~~~", // 15  (祭壇島x3..6 / エルフ島x51..55)
"~~~.h..~ddddddddddd~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~FFFFFFF~~~~", // 16  (火山島x8..18)
"~~~....~dmmmddddmmd~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~FFF6FFF~~~~", // 17
"~~~....~dmLddvddLmd~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~FFFFFFF~~~~", // 18
"~~~~~~~~dmdddddddmd~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~FFFFF~~~~~", // 19
"~~~~~~~~ddddddddddd~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~", // 20
"~~~~~~~~dddmmdmmddd~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~", // 21
"~~~~~~~~ddddddddddd~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~", // 22
"~~~~~~~~ddddddddddd~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~", // 23
"~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~...........FFFFFFFFFFF~~~~~", // 24
"~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~...........FFFFFFfFFFF~~~~~", // 25
"~~~~~~~~~~~~~~~~~~~~~~~~~mmmmmm.............FFFFFFFFF..~~~~~", // 26
"~~~~~~~~~~~~~~~~~~~~~~~~~m~~~~..............FFFFFFF....~~~~~", // 27
"~~~~~~~~~~~~~~~~~~~~~~~~~m~~~~........2.....mmmm.......~~~~~", // 28
"~~~~~~~~~~~~~~~~~~~~~~~~~m~~~~..............mm.........~~~~~", // 29
"~~~ssssssssssssssssss~~~~~~~~3.........................~~~~~", // 30
"~~~ssssssssssssssssss~~~~m~~~~.........................~~~~~", // 31
"~~~sssssmmmssssssssss~~~~m~~~~.........mm.mmmmmmmmm....~~~~~", // 32
"~~~sssssssss4ssssssss~~~~m~~~~,,,,,,...................~~~~~", // 33
"~~~ssssssssssssssssss~~~~mmmmmm........................~~~~~", // 34
"~~~ssssssssssssssssss~~~~~~~~~.........................~~~~~", // 35
"~~~sssssssssssmmmss~~~~~~~~~~~....................,,,c.~~~~~", // 36
"~~~sssssssssssssssss~~~~~~~~~~................mmmm.....~~~~~", // 37
"~~~sssssssssssssssss~~~~~~~~~~......,,,,,,,,,..........~~~~~", // 38
"~~~sssspssssssssssss~~~~~~~~~~..........1..............~~~~~", // 39
"~~~sssssssssssssssss~~~~~~~~~~...........,,,,,,,.......~~~~~", // 40
"~~~sssssssssssssssss~~~~~~~~~~.........................~~~~~", // 41
"~~~sssssssssmmmmssss~~~~~~~~~~.........................~~~~~", // 42
"~~~sssssssssssssssss~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~", // 43
"~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~", // 44
"~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~", // 45
];

// ---------------- 町マップ ----------------
const RION_TILES = [
"TTTTTTTTTTTTTTTTTTTTTT",
"T....................T",
"T.rrrr..bbbb..rrrr...T",
"T.WnnW..WnnW..WnnW...T",
"T.WWDW..WWDW..WWDW...T",
"T....................T",
"T.rrrr...............T",
"T.WnnW.....~~~.......T",
"T.WWDW.....~~~.......T",
"T....................T",
"T....................T",
"T....................T",
"T....................T",
"TTTTTTTTTT>>TTTTTTTTTT",
];

const GRANDIA_TILES = [
"TTTTTTTTTTTTTTTTTTTTTTTTTTTT",
"T..........................T",
"T...BBBBBBBBBBBBBBBBBBBB...T",
"T...B__________________B...T",
"T...B__________________B...T",
"T...B__________________B...T",
"T...BBBBBBBB_kk_BBBBBBBB...T",
"T............kk............T",
"T.rrrr.rrrr..kk..bbbb.rrrr.T",
"T.WnnW.WnnW..kk..WnnW.WnnW.T",
"T.WWDW.WWDW..kk..WWDW.WWDW.T",
"T............kk............T",
"T............kk............T",
"T.rrrr.......kk.......rrrr.T",
"T.WnnW.......kk.......WnnW.T",
"T.WWDW.......kk.......WWDW.T",
"T............kk............T",
"TTTTTTTTTTTTT>>TTTTTTTTTTTTT",
];

const MARINA_TILES = [
"TTTTTTTTTTTTTTTTTTTTTTTT",
"T......................T",
"T.rrrr..bbbb..rrrr.....T",
"T.WnnW..WnnW..WnnW.....T",
"T.WWDW..WWDW..WWDW.....T",
"T......................T",
"T......................T",
"T..rrrr................T",
"T..WnnW................T",
"T..WWDW................T",
"T......................T",
"T.~~~~~~~~~KK~~~~~~~~~.T",
"T.~~~~~~~~~KK~~~~~~~~~.T",
"TTTTTTTTTTT>>TTTTTTTTTTT",
];

const SANDRA_TILES = [
"TTTTTTTTTTTTTTTTTTTT",
"TssssssssssssssssssT",
"TsrrrrssbbbbssrrrrsT",
"TsWnnWssWnnWssWnnWsT",
"TsWWDWssWWDWssWWDWsT",
"TssssssssssssssssssT",
"TsrrrrsssssssssssssT",
"TsWnnWsssssssssssssT",
"TsWWDWsssssssssssssT",
"TssssssssssssssssssT",
"TssssssssssssssssssT",
"TssssssssssssssssssT",
"TTTTTTTTT>>TTTTTTTTT",
];

const FUBUKI_TILES = [
"TTTTTTTTTTTTTTTTTT",
"TSSSSSSSSSSSSSSSST",
"TSbbbbSSSSrrrrSSST",
"TSWnnWSSSSWnnWSSST",
"TSWWDWSSSSWWDWSSST",
"TSSSSSSSSSSSSSSSST",
"TSrrrrSSSSSSSSSSST",
"TSWnnWSSSSSSSSSSST",
"TSWWDWSSSSSSSSSSST",
"TSSSSSSSSSSSSSSSST",
"TSSSSSSSSSSSSSSSST",
"TTTTTTTT>>TTTTTTTT",
];

const ELF_TILES = [
"TTTTTTTTTTTTTTTT",
"T..............T",
"T.rrrr....bbbb.T",
"T.WnnW....WnnW.T",
"T.WWDW....WWDW.T",
"T..............T",
"T..............T",
"T....~~~~......T",
"T..............T",
"T..............T",
"TTTTTTT>>TTTTTTT",
];

// ---------------- ダンジョン（自動彫刻） ----------------
function buildCave1(){            // ひびきの洞窟 28x20
  const g = gridBlank(28,20,'#');
  carve(g,11,15,17,18);   // 入口の間
  carve(g,14,11,14,15);   // 通路
  carve(g,5,7,22,11);     // 大広間
  carve(g,5,4,5,7);       // 西通路
  carve(g,2,1,9,4);       // ボスの間
  carve(g,22,3,25,7);     // 東宝物庫
  carve(g,7,11,7,14);     // 袋小路
  carve(g,14,18,14,18,'>');
  return g;
}
function buildRuins(){            // 森の遺跡 26x20
  const g = gridBlank(26,20,'#');
  carve(g,10,14,16,17);   // 入口の間
  carve(g,13,10,13,14);   // 通路
  carve(g,4,6,21,10);     // 大広間
  carve(g,2,2,8,4);       // 西の間
  carve(g,5,4,5,6);
  carve(g,17,2,23,4);     // 東の間
  carve(g,20,4,20,6);
  carve(g,11,1,15,3);     // ボスの間
  carve(g,13,3,13,6);
  carve(g,2,9,3,9);       // 袋小路
  carve(g,13,17,13,17,'>');
  return g;
}
function buildPyramid(){          // ピラミッド 30x22
  const g = gridBlank(30,22,'#');
  carve(g,12,17,18,20);   // 入口の間
  carve(g,15,13,15,17);   // 通路
  carve(g,5,9,24,13);     // 大広間
  carve(g,3,4,9,7);       // 西の翼
  carve(g,6,7,6,9);
  carve(g,20,4,26,7);     // 東の翼
  carve(g,23,7,23,9);
  carve(g,13,1,17,4);     // ボスの間（玄室）
  carve(g,15,4,15,9);
  carve(g,3,11,4,12);     // 隠し小部屋
  carve(g,15,20,15,20,'>');
  return g;
}
function buildVolcano(){          // 火山 28x20
  const g = gridBlank(28,20,'#');
  carve(g,11,15,17,18);   // 入口の間
  carve(g,14,12,14,15);   // 通路
  carve(g,4,8,23,12);     // 大広間
  carve(g,4,4,10,6);      // 西の間
  carve(g,7,6,7,8);
  carve(g,17,4,23,6);     // 東の間
  carve(g,20,6,20,8);
  carve(g,12,1,16,3);     // ボスの間（火口）
  carve(g,14,3,14,8);
  carve(g,14,18,14,18,'>');
  return g;
}
function buildIceTemple(){        // 氷の神殿 28x20
  const g = gridBlank(28,20,'#');
  carve(g,11,15,17,18);   // 入口の間
  carve(g,14,13,14,15);   // 通路
  carve(g,3,10,24,13);    // 下広間
  carve(g,4,4,4,10);      // 西階段
  carve(g,23,4,23,10);    // 東階段
  carve(g,4,4,23,5);      // 上広間
  carve(g,12,1,16,3);     // ボスの間
  carve(g,14,3,14,4);
  carve(g,2,12,3,12);     // 袋小路
  carve(g,14,18,14,18,'>');
  return g;
}
function buildAltar(){            // 記憶の祭壇 20x16
  const g = gridBlank(20,16,'#');
  carve(g,3,3,16,12);     // 大広間
  carve(g,8,12,11,14);    // 入口
  carve(g,9,14,9,14,'>');
  return g;
}
function buildDarkCastle(){       // 暗黒城 32x26
  const g = gridBlank(32,26,'#');
  carve(g,13,21,19,24);   // 入口の間
  carve(g,16,17,16,21);   // 通路
  carve(g,6,13,26,17);    // 大広間
  carve(g,3,8,9,11);      // 西の間
  carve(g,6,11,6,13);
  carve(g,23,8,29,11);    // 東の間
  carve(g,26,11,26,13);
  carve(g,16,8,16,13);    // 北回廊（将軍が塞ぐ）
  carve(g,8,5,24,7);      // 上広間
  carve(g,16,4,16,5);
  carve(g,12,1,20,3);     // 玉座の間
  carve(g,16,24,16,24,'>');
  return g;
}

// ---------------- マップ定義 ----------------
const MAPS = {
  world: {
    name:'ヒカリの大陸と七つの海', tiles:WORLD_TILES, bgm:'field', world:true, pad:'~',
    npcs:[],
    objects:[],
  },
  rion: {
    name:'リオン村', tiles:RION_TILES, bgm:'town', town:true, pad:'T',
    entry:{x:10,y:12}, exitTo:{x:40,y:40},
    npcs:[
      {x:4, y:5, emoji:'👩', inn:8},
      {x:10,y:5, emoji:'👨', shop:'rion'},
      {x:16,y:5, emoji:'👴', event:'elder'},
      {x:4, y:9, emoji:'⛪', church:true},
      {x:7, y:10,emoji:'👵', msg:['メニュー(Xキー)から いつでも セーブできるよ。','こまめに セーブするんだよ。']},
      {x:14,y:8, emoji:'🧒', msg:['10ねんまえ ゆうしゃユウさまが まおうザルバを たおしたんだ！','ぼくも おおきくなったら ゆうしゃに なる！'], wander:true},
      {x:17,y:10,emoji:'👨', msg:['ひがしの ひびきの洞窟に まものが ふえている…','むらの きこりが おそわれたそうだ。'], wander:true},
      {x:5, y:11,emoji:'👩', msg:['きたの とうげを こえると 王都グランディア。','おうさまに あいさつ していくと いいよ。'], wander:true},
    ],
    objects:[],
  },
  grandia: {
    name:'王都グランディア', tiles:GRANDIA_TILES, bgm:'town', town:true, pad:'T',
    entry:{x:13,y:16}, exitTo:{x:38,y:29},
    npcs:[
      {x:13,y:4, emoji:'👑', event:'king'},
      {x:15,y:4, emoji:'🧙', event:'mira', unless:'j_mira'},
      {x:12,y:5, emoji:'💂', msg:['ここは グランディアじょう。','おうさまが おまちかねだ。とおられよ。']},
      {x:16,y:5, emoji:'💂', msg:['せいなる星が くだけて 5つの かけらが とびちった…','せかいの あちこちが おかしく なっておる。']},
      {x:4, y:11,emoji:'👩', inn:24},
      {x:9, y:11,emoji:'👨', shop:'grandia'},
      {x:18,y:11,emoji:'⛪', church:true},
      {x:23,y:11,emoji:'👵', msg:['にしの みなとまち マリナから ふねが でるそうじゃ。','じゅんびが できたら いってみるが よい。'], wander:true},
      {x:6, y:16,emoji:'🧒', msg:['おしろの まほうつかい ミラさまは てんさいなんだって！'], wander:true},
      {x:20,y:16,emoji:'👨', msg:['きたの もりの おくに ふるい いせきが ある。','ちかづいた ものは ねむらされて しまうとか…'], wander:true},
    ],
    objects:[],
  },
  marina: {
    name:'みなとまち マリナ', tiles:MARINA_TILES, bgm:'town', town:true, pad:'T',
    entry:{x:11,y:10}, exitTo:{x:30,y:30},
    npcs:[
      {x:4, y:5, emoji:'👩', inn:60},
      {x:10,y:5, emoji:'👨', shop:'marina'},
      {x:16,y:5, emoji:'⛪', event:'sena', unless:'j_sena'},
      {x:16,y:5, emoji:'⛪', church:true, requires:'j_sena'},
      {x:13,y:10,emoji:'💂', event:'harbor'},
      {x:6, y:9, emoji:'👴', msg:['わんの そとに ばけものダコが すみついてなあ…','ふねが そとうみに でられんのじゃ。'], wander:true},
      {x:17,y:7, emoji:'🧒', msg:['みなみの さばくには ピラミッドが あるんだって！','おうごんが ザックザク らしいよ！'], wander:true},
      {x:19,y:9, emoji:'👵', msg:['きたの ゆきぐにには フブキという むらがある。','そのさきの しんでんは こおりの まものだらけじゃ。'], wander:true},
    ],
    objects:[],
  },
  sandra: {
    name:'さばくのまち サンドラ', tiles:SANDRA_TILES, bgm:'town', town:true, pad:'T',
    entry:{x:9,y:11}, exitTo:{x:12,y:34},
    npcs:[
      {x:4, y:5, emoji:'👩', inn:120},
      {x:10,y:5, emoji:'👨', shop:'sandra'},
      {x:16,y:5, emoji:'⛪', church:true},
      {x:4, y:9, emoji:'👴', msg:['にしの ピラミッドには 王家のぼうれいが でるという…','ほしのかけらの ひかりを みたという ものも おる。']},
      {x:12,y:8, emoji:'🧒', msg:['さばくの まものは どくを つかうよ！','どくけしそうを わすれずにね！'], wander:true},
      {x:15,y:9, emoji:'👨', msg:['きたの ちいさな しまに 火山が ある。','えんりゅうが めざめたと うわさだ…'], wander:true},
    ],
    objects:[],
  },
  fubuki: {
    name:'ゆきのむら フブキ', tiles:FUBUKI_TILES, bgm:'town', town:true, pad:'T',
    entry:{x:8,y:10}, exitTo:{x:28,y:10},
    npcs:[
      {x:4, y:5, emoji:'👵', inn:200},
      {x:12,y:5, emoji:'👨', shop:'fubuki'},
      {x:4, y:9, emoji:'⛪', church:true},
      {x:8, y:6, emoji:'👴', msg:['ひがしの 氷の神殿に さいごの ほしのかけらが ある。','しんでんのぬし レイガは おそろしく つよいぞ…'], wander:true},
      {x:13,y:8, emoji:'🧒', msg:['にしの うみの ちいさな しまに ふしぎな ほこらが あるんだって。','ゆうしゃユウさまに あえるって ほんとかなあ？'], wander:true},
      {x:11,y:9, emoji:'👩', msg:['5つの かけらを あつめたら きたの しまへ…','まおうの けっかいを やぶれるのは あなたたちだけよ。'], wander:true},
    ],
    objects:[],
  },
  elf: {
    name:'エルフのかくれざと', tiles:ELF_TILES, bgm:'town', town:true, pad:'T',
    entry:{x:7,y:9}, exitTo:{x:53,y:18},
    npcs:[
      {x:4, y:5, emoji:'👴', event:'elfelder'},
      {x:12,y:5, emoji:'👨', shop:'elf'},
      {x:3, y:8, emoji:'👩', inn:150},
      {x:11,y:8, emoji:'🧒', msg:['ノワールは ザルバの やみから うまれた まおう。','ひかりの ちからに よわいんだよ。'], wander:true},
    ],
    objects:[],
  },
  cave1: {
    name:'ひびきの洞窟', tiles:buildCave1(), bgm:'dungeon', dungeon:true, pad:'#',
    entry:{x:14,y:17}, exitTo:{x:52,y:36}, enc:{table:'cave1', rate:13},
    npcs:[],
    objects:[
      {id:'c1_g', type:'chest', x:24, y:4,  gold:100},
      {id:'c1_h', type:'chest', x:21, y:8,  item:'herb'},
      {id:'c1_s', type:'chest', x:7,  y:14, item:'seedstr'},
      {id:'c1_b', type:'boss',  x:5,  y:2,  monster:'goblinlord', flag:'s1', shard:true},
    ],
  },
  ruins: {
    name:'もりの遺跡', tiles:buildRuins(), bgm:'dungeon', dungeon:true, pad:'#',
    entry:{x:13,y:16}, exitTo:{x:51,y:26}, enc:{table:'ruins', rate:13},
    npcs:[],
    objects:[
      {id:'ru_g', type:'chest', x:3,  y:3, gold:300},
      {id:'ru_m', type:'chest', x:22, y:3, item:'mwater'},
      {id:'ru_d', type:'chest', x:2,  y:9, item:'seeddef'},
      {id:'ru_b', type:'boss',  x:13, y:2, monster:'eldertrent', flag:'s2', shard:true},
    ],
  },
  pyramid: {
    name:'おうごんのピラミッド', tiles:buildPyramid(), bgm:'dungeon', dungeon:true, pad:'#',
    entry:{x:15,y:19}, exitTo:{x:7,y:41}, enc:{table:'pyramid', rate:13},
    npcs:[],
    objects:[
      {id:'py_g', type:'chest', x:4,  y:5,  gold:1200},
      {id:'py_h', type:'chest', x:25, y:5,  item:'hherb'},
      {id:'py_a', type:'chest', x:3,  y:11, item:'seedagi'},
      {id:'py_w', type:'chest', x:26, y:6,  gold:800},
      {id:'py_b', type:'boss',  x:15, y:2,  monster:'pharaoh', flag:'s3', shard:true},
    ],
  },
  volcano: {
    name:'ごうかの火山', tiles:buildVolcano(), bgm:'dungeon', dungeon:true, pad:'#',
    entry:{x:14,y:17}, exitTo:{x:13,y:19}, enc:{table:'volcano', rate:13},
    npcs:[],
    objects:[
      {id:'v_g', type:'chest', x:5,  y:5,  gold:1500},
      {id:'v_l', type:'chest', x:22, y:5,  item:'lifeorb'},
      {id:'v_s', type:'chest', x:4,  y:12, item:'seedstr'},
      {id:'v_b', type:'boss',  x:14, y:2,  monster:'ignis', flag:'s4', shard:true},
    ],
  },
  icetemple: {
    name:'こおりの神殿', tiles:buildIceTemple(), bgm:'dungeon', dungeon:true, pad:'#',
    entry:{x:14,y:17}, exitTo:{x:45,y:7}, enc:{table:'icetemple', rate:13},
    npcs:[],
    objects:[
      {id:'it_g', type:'chest', x:4,  y:10, gold:2500},
      {id:'it_m', type:'chest', x:23, y:10, item:'mwater2'},
      {id:'it_a', type:'chest', x:2,  y:12, item:'seedagi'},
      {id:'it_b', type:'boss',  x:14, y:2,  monster:'reiga', flag:'s5', shard:true},
    ],
  },
  altar: {
    name:'きおくの祭壇', tiles:buildAltar(), bgm:'dungeon', dungeon:true, pad:'#',
    entry:{x:9,y:13}, exitTo:{x:4,y:17},
    npcs:[
      {x:9, y:8, emoji:'🦸', event:'yu'},
    ],
    objects:[
      {id:'al_1', type:'boss', x:5,  y:4, monster:'m_gaiaworm', flag:'m1', memory:true,
       reward:{item:'lifeorb', n:2},
       pre:['いしぶみに きざまれし たたかいの きおく…','《かぜのどうくつの ぬし》が よみがえる！']},
      {id:'al_2', type:'boss', x:8,  y:4, monster:'m_grantree', flag:'m2', memory:true,
       reward:{item:'a_light'},
       pre:['いしぶみに きざまれし たたかいの きおく…','《もりのぬし》が よみがえる！']},
      {id:'al_3', type:'boss', x:11, y:4, monster:'m_glacies', flag:'m3', memory:true,
       reward:{item:'s_light'},
       pre:['いしぶみに きざまれし たたかいの きおく…','《ひょうてい》が よみがえる！']},
      {id:'al_4', type:'boss', x:14, y:4, monster:'m_zarba', flag:'m4', memory:true, requires:['m1','m2','m3'],
       reward:{item:'w_hero'},
       lockMsg:['いしぶみは くらく しずんでいる。','（ほかの 3つの きおくを たおすと めざめる ようだ）'],
       pre:['いしぶみが やみの ひかりに つつまれる……','10ねんまえ せかいを おびやかした きょうふ──','《まおうザルバ》の きおくが よみがえる！！']},
    ],
  },
  darkcastle: {
    name:'暗黒城', tiles:buildDarkCastle(), bgm:'final', dungeon:true, pad:'#',
    entry:{x:16,y:23}, exitTo:{x:13,y:8}, enc:{table:'darkcastle', rate:12},
    npcs:[],
    objects:[
      {id:'dc_r', type:'chest', x:9,  y:6,  item:'w_ruin'},
      {id:'dc_g', type:'chest', x:23, y:6,  gold:2000},
      {id:'dc_w', type:'chest', x:4,  y:9,  item:'w_sage'},
      {id:'dc_a', type:'chest', x:24, y:9,  item:'a_dark'},
      {id:'dc_l', type:'chest', x:28, y:9,  item:'lifeorb'},
      {id:'dc_m', type:'boss',  x:16, y:10, monster:'darkgeneral', flag:'dgen',
       pre:['「ここから さきは とおさぬ。」','「まぐんしょう ザガンが あいてに なろう！」'],
       win:['ザガンは くずれおちた…','「ノワールさま… おゆるしを……」']},
      {id:'dc_b', type:'boss',  x:16, y:2,  monster:'noir', flag:'clear', final:true,
       pre:['「よくぞ ここまで きたな ちいさき ものたちよ。」','「ザルバの やみより うまれし わが ちから──」','「とくと あじわう が よい！！」']},
    ],
  },
};

// ワールドの入口タイル → マップ
const ENTRANCES = {
  '1':'rion', '2':'grandia', '3':'marina', '4':'sandra', '5':'fubuki', '6':'elf',
  'c':'cave1', 'f':'ruins', 'p':'pyramid', 'v':'volcano', 'i':'icetemple', 'h':'altar', 'X':'darkcastle',
};

// タイル歩行可否。'g'はゲート、'~'は船所持時のみ（game.jsで特別処理）
const WALKABLE = new Set(['.', ',', 'F', 'S', 's', 'd', '=', '-', '>', '_', 'k', 'K',
  '1','2','3','4','5','6','c','f','p','v','i','h','X']);
// NPCが徘徊できるタイル
const WANDER_OK = new Set(['.', 'S', 's', '_', 'k', 'F']);
