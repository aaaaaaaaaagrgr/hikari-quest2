// node tools/dumpworld.js — ワールドマップを行番号・長さ付きで表示
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname,'..','data.js'),'utf8');
const m = src.match(/const WORLD_TILES = \[([\s\S]*?)\];/)[1];
const rows = [...m.matchAll(/"([^"]*)"/g)].map(x=>x[1]);
console.log('    ' + Array.from({length:60},(_,i)=>i%10===0?String(i/10):' ').join(''));
console.log('    ' + Array.from({length:60},(_,i)=>i%10).join(''));
rows.forEach((r,i)=>console.log(String(i).padStart(2)+' '+String(r.length).padStart(3)+'|'+r+'|'));
