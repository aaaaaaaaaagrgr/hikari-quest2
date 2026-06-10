# -*- coding: utf-8 -*-
"""
ヒカリの伝説II 新素材切り出しスクリプト
赤グリッドのシート → 透過PNG / 64pxタイル / 背景分割 を hikari-quest2/assets/ へ。
"""
import os
from collections import deque
import numpy as np
from PIL import Image

SRC = r"C:\Users\kaite\.codex\generated_images\019eb03f-7957-7bf1-bb5e-951c0d09c8d3"
OUT = r"C:\Users\kaite\hikari-quest2\assets"
os.makedirs(OUT, exist_ok=True)

F = {
  1: "ig_0e59f50fcc01a66f016a2906a08fd08191b3a2e31c08ddfcde.png",  # 仲間3人
  2: "ig_0e59f50fcc01a66f016a29078a23f08191bfb4393fa0e11c9b.png",  # ボスA
  3: "ig_0e59f50fcc01a66f016a290892a7988191a39fab4d4b0a1637.png",  # ボスB
  4: "ig_0e59f50fcc01a66f016a2908ff59f081918346cabe242d7cbe.png",  # noir2
  5: "ig_0e59f50fcc01a66f016a29095bef94819193720fb90a88bc8a.png",  # ザコA
  6: "ig_0e59f50fcc01a66f016a290b56c6cc8191833963d98caf11aa.png",  # ザコB+NPC+船
  7: "ig_0e59f50fcc01a66f016a290bcc83348191bbae22e265db2ccd.png",  # タイル
  8: "ig_0e59f50fcc01a66f016a290c5142c48191bd9294e3a135dc18.png",  # bg 砂漠/火山
  9: "ig_0e59f50fcc01a66f016a290cc449dc8191b07c08e2d9a65433.png",  # bg 海/暗黒城
  10:"ig_0e59f50fcc01a66f016a290d2de0748191bb71a79e64b21bfb.png",  # logo2
}

SHEETS = [
  (F[1], 3, 3, ["garde_front","garde_back","garde_side",
                "mira_front","mira_back","mira_side",
                "sena_front","sena_back","sena_side"], 256),
  (F[2], 2, 2, ["goblinlord","eldertrent","kraken","pharaoh"], 320),
  (F[3], 2, 2, ["ignis","reiga","darkgeneral","noir"], 320),
  (F[5], 3, 3, ["kingslime","seaserpent","merman","scorpion","mummy","sandgolem",
                "flamewolf","lavagolem","firebird"], 256),
  (F[6], 3, 3, ["icedevil","snowghost","hellhound","archdemon","blackdragon","darkmage",
                "king","sister","ship"], 256),
]
SINGLES = [(F[4], "noir2", 512), (F[10], "logo2", 400)]
TILES = (F[7], 3, 3, ["floor_pyramid","wall_pyramid","floor_volcano","wall_volcano",
                      "floor_altar","wall_altar","lava", None, None])
BGS = [(F[8], ["bg_desert","bg_volcano"]), (F[9], ["bg_sea","bg_dark"])]
FLIP_H = set()      # 生成画像は指示どおり左向きだったので反転不要

def red_mask(arr):
    r,g,b = arr[...,0].astype(int), arr[...,1].astype(int), arr[...,2].astype(int)
    return (r>150) & (g<105) & (b<105)

def line_groups(frac, thresh=0.4):
    hot = frac > thresh
    groups, i, n = [], 0, len(hot)
    while i < n:
        if hot[i]:
            j = i
            while j < n and hot[j]: j += 1
            groups.append((i, j-1)); i = j
        else:
            i += 1
    return groups

def cell_bands(arr, axis, count):
    rm = red_mask(arr)
    frac = rm.mean(axis=1) if axis==0 else rm.mean(axis=0)
    groups = line_groups(frac)
    bands = []
    if len(groups) >= count+1:
        for k in range(len(groups)-1):
            s, e = groups[k][1]+1, groups[k+1][0]-1
            if e-s > 10: bands.append((s,e))
    if len(bands) != count:
        L = arr.shape[0] if axis==0 else arr.shape[1]
        s0 = groups[0][1]+1 if groups else 0
        e0 = groups[-1][0]-1 if groups else L-1
        span = (e0-s0)/count
        bands = [(int(s0+span*k), int(s0+span*(k+1))-1) for k in range(count)]
    return bands

def make_transparent(cell):
    arr = np.array(cell.convert("RGBA"))
    h, w = arr.shape[:2]
    r,g,b = arr[...,0].astype(int), arr[...,1].astype(int), arr[...,2].astype(int)
    whiteish = (r>=232) & (g>=232) & (b>=232)
    bg_candidate = whiteish | red_mask(arr)
    visited = np.zeros((h,w), bool)
    dq = deque()
    for x in range(w):
        for y in (0, h-1):
            if bg_candidate[y,x] and not visited[y,x]:
                visited[y,x]=True; dq.append((y,x))
    for y in range(h):
        for x in (0, w-1):
            if bg_candidate[y,x] and not visited[y,x]:
                visited[y,x]=True; dq.append((y,x))
    while dq:
        y,x = dq.popleft()
        for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny,nx = y+dy, x+dx
            if 0<=ny<h and 0<=nx<w and not visited[ny,nx] and bg_candidate[ny,nx]:
                visited[ny,nx]=True; dq.append((ny,nx))
    arr[visited, 3] = 0
    return Image.fromarray(arr, "RGBA")

def trim(img):
    arr = np.array(img)
    ys, xs = np.where(arr[...,3] > 8)
    if len(xs)==0: return img
    pad = 2
    x0,x1 = max(0,xs.min()-pad), min(arr.shape[1], xs.max()+pad+1)
    y0,y1 = max(0,ys.min()-pad), min(arr.shape[0], ys.max()+pad+1)
    return img.crop((x0,y0,x1,y1))

def cap(img, maxside):
    w,h = img.size
    m = max(w,h)
    if m > maxside:
        s = maxside/m
        img = img.resize((round(w*s), round(h*s)), Image.LANCZOS)
    return img

def save(img, name):
    img.save(os.path.join(OUT, name+".png"))
    print(f"  -> {name}.png  {img.size}")

# --- グリッドシート（透過） ---
for rel, rows, cols, names, maxside in SHEETS:
    src = os.path.join(SRC, rel)
    print(f"[sheet] {rel[:24]}... -> {names[0]}...")
    im = Image.open(src).convert("RGB")
    arr = np.array(im)
    rb = cell_bands(arr, 0, rows)
    cb = cell_bands(arr, 1, cols)
    idx = 0
    for (ry0,ry1) in rb:
        for (cx0,cx1) in cb:
            if idx >= len(names): continue
            inset = 3
            cell = im.crop((cx0+inset, ry0+inset, cx1-inset, ry1-inset))
            t = cap(trim(make_transparent(cell)), maxside)
            if names[idx] in FLIP_H:
                t = t.transpose(Image.FLIP_LEFT_RIGHT)
            save(t, names[idx])
            idx += 1

# --- 単体（透過） ---
for rel, name, maxside in SINGLES:
    src = os.path.join(SRC, rel)
    print(f"[single] {name}")
    im = Image.open(src).convert("RGB")
    save(cap(trim(make_transparent(im)), maxside), name)

# --- タイル（不透明64px） ---
rel, rows, cols, names = TILES
src = os.path.join(SRC, rel)
print(f"[tiles] {names[0]}...")
im = Image.open(src).convert("RGB")
arr = np.array(im)
rb = cell_bands(arr, 0, rows)
cb = cell_bands(arr, 1, cols)
idx = 0
for (ry0,ry1) in rb:
    for (cx0,cx1) in cb:
        if idx >= len(names): continue
        name = names[idx]; idx += 1
        if name is None: continue
        inset = 5
        cell = im.crop((cx0+inset, ry0+inset, cx1-inset, ry1-inset))
        w,h = cell.size; s = min(w,h)
        sq = cell.crop(((w-s)//2,(h-s)//2,(w-s)//2+s,(h-s)//2+s))
        save(sq.resize((64,64), Image.LANCZOS), name)

# --- 背景（赤い水平線で上下分割） ---
for rel, names in BGS:
    src = os.path.join(SRC, rel)
    print(f"[bg] {names}")
    im = Image.open(src).convert("RGB")
    arr = np.array(im)
    rm = red_mask(arr).mean(axis=1)
    groups = line_groups(rm)
    mid = im.height//2
    sep = min(groups, key=lambda gp: abs((gp[0]+gp[1])//2 - mid)) if groups else (mid,mid)
    top = im.crop((0,0,im.width, sep[0]))
    bot = im.crop((0, sep[1]+1, im.width, im.height))
    save(cap(top, 704), names[0])
    save(cap(bot, 704), names[1])

print("DONE")
