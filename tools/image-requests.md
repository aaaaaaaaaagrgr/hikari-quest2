# ヒカリの伝説II 画像生成リクエスト一覧

このファイルは、画像生成AIにそのまま貼って使えるプロンプト集です。
各プロンプトは共有ルールを省略せず、単体で成立するように書いてあります。

生成したPNGは、指定のファイル名で `assets/` に配置してください。
シート画像は生成後に切り出して、ゲーム側の素材として使います。

## 1. 仲間キャラ3人 3x3シート

切り出し後のファイル名:
`garde_front`, `garde_back`, `garde_side`, `mira_front`, `mira_back`, `mira_side`, `sena_front`, `sena_back`, `sena_side`

```text
Create one 1024x1024 PNG image.
Style: 16-bit retro JRPG pixel art, inspired by classic Dragon Quest and SNES fantasy RPG character sprites.

Canvas layout:
- Divide the image into a 3x3 grid of equal square cells.
- Draw thick bright red (#FF0000) grid lines between the cells.
- Every cell must have a pure white background.
- Each cell must contain exactly one full-body chibi character sprite.
- The character must be centered, fully visible, and fully inside the cell.
- Do not let any character touch or overlap the red grid lines.
- No text, no labels, no shadows, no transparent background.

Cells in order, left to right, top to bottom:
1. A sturdy young warrior man with spiky red hair, a green tunic, leather boots, and a broadsword on his back, seen from the front.
2. The same red-haired warrior, seen from behind.
3. The same red-haired warrior, side view walking, facing left.
4. A cheerful young sorceress girl with a purple witch hat, purple robe, and a wooden staff, seen from the front.
5. The same purple sorceress, seen from behind.
6. The same purple sorceress, side view walking, facing left.
7. A gentle young priestess with long silver hair, white-and-blue vestments, and a small holy book, seen from the front.
8. The same silver-haired priestess, seen from behind.
9. The same silver-haired priestess, side view walking, facing left.

Important:
- Keep the same character design consistent across each character's front, back, and side views.
- The side-view sprites must face left.
- Make the sprites clean, readable, cute, and game-ready.
```

## 2. 新ボスA 2x2シート

切り出し後のファイル名:
`goblinlord`, `eldertrent`, `kraken`, `pharaoh`

```text
Create one 1024x1024 PNG image.
Style: 16-bit retro JRPG pixel art, inspired by classic Dragon Quest and SNES fantasy RPG boss monster sprites.

Canvas layout:
- Divide the image into a 2x2 grid of equal square cells.
- Draw thick bright red (#FF0000) grid lines between the cells.
- Every cell must have a pure white background.
- Each cell must contain exactly one large impressive boss monster sprite.
- The monster must be centered, fully visible, and fully inside the cell.
- Do not let any monster touch or overlap the red grid lines.
- No text, no labels, no shadows, no transparent background.

Cells in order, left to right, top to bottom:
1. A huge goblin king wearing a bone crown, holding a massive spiked club, with an arrogant grin.
2. An ancient colossal treant elder with a long moss beard, glowing amber eyes, and branches like claws.
3. A monstrous giant kraken octopus with massive tentacles and one huge glaring eye.
4. A mummy pharaoh ghost wearing a golden funerary mask and a royal blue-and-gold headdress, wrapped in glowing bandages.

Important:
- Make each boss visually distinct and readable at game size.
- Use strong silhouettes and classic fantasy RPG monster design.
```

## 3. 新ボスB 2x2シート

切り出し後のファイル名:
`ignis`, `reiga`, `darkgeneral`, `noir`

```text
Create one 1024x1024 PNG image.
Style: 16-bit retro JRPG pixel art, inspired by classic Dragon Quest and SNES fantasy RPG boss monster sprites.

Canvas layout:
- Divide the image into a 2x2 grid of equal square cells.
- Draw thick bright red (#FF0000) grid lines between the cells.
- Every cell must have a pure white background.
- Each cell must contain exactly one large impressive boss monster sprite.
- The monster must be centered, fully visible, and fully inside the cell.
- Do not let any monster touch or overlap the red grid lines.
- No text, no labels, no shadows, no transparent background.

Cells in order, left to right, top to bottom:
1. A magnificent flame dragon wreathed in swirling fire, with molten orange scales, roaring.
2. A towering ice shogun general in samurai-style frozen armor, holding a giant ice naginata.
3. A sinister dark army general in jagged black armor, with a skull pauldron and a hellish greatsword.
4. A new demon king with elegant black wings, a pale noble face, a dark violet aura, and royal dark robes.

Important:
- Make each boss visually distinct and readable at game size.
- Use dramatic poses while keeping the full body inside the cell.
```

## 4. ノワール真の姿

保存ファイル名:
`noir2`

```text
Create one 1024x1024 PNG image.
Style: 16-bit retro JRPG pixel art, inspired by classic Dragon Quest and SNES fantasy RPG final boss sprites.

Canvas layout:
- Use a pure white background.
- Place exactly one final boss monster in the center.
- The full body must be visible and fully inside the image.
- No text, no labels, no shadows, no transparent background.

Subject:
A single gigantic demon god of destruction, terrifying and majestic, with four black wings, a body cracking with glowing dark-violet energy, a floating crown of shadow, sharp demonic features, and a powerful final-boss silhouette.

Important:
- Make the sprite clean, readable, and game-ready.
- Keep the design clearly related to a dark demon king's true second form.
```

## 5. 新ザコモンスターA 3x3シート

切り出し後のファイル名:
`kingslime`, `seaserpent`, `merman`, `scorpion`, `mummy`, `sandgolem`, `flamewolf`, `lavagolem`, `firebird`

```text
Create one 1024x1024 PNG image.
Style: 16-bit retro JRPG pixel art, inspired by classic Dragon Quest and SNES fantasy RPG monster sprites.

Canvas layout:
- Divide the image into a 3x3 grid of equal square cells.
- Draw thick bright red (#FF0000) grid lines between the cells.
- Every cell must have a pure white background.
- Each cell must contain exactly one monster sprite facing the viewer.
- The monster must be centered, fully visible, and fully inside the cell.
- Do not let any monster touch or overlap the red grid lines.
- No text, no labels, no shadows, no transparent background.

Cells in order, left to right, top to bottom:
1. A big royal slime wearing a tiny golden crown, with a smug face.
2. A sea serpent rising from a wave, with teal scales and fanged jaws.
3. A merman warrior with a fish tail, holding a coral trident.
4. A giant desert scorpion with an armored black-red carapace and a glowing stinger.
5. A shambling mummy man with trailing bandages and glowing eyes.
6. A hulking golem made of packed sand and sandstone blocks.
7. A fierce wolf wreathed in flames, with ember-orange fur.
8. A lumbering golem made of cooling lava, with glowing magma cracks.
9. A blazing phoenix-like firebird with a long flaming tail.

Important:
- Make every monster visually distinct and readable at game size.
- Keep the style consistent across all nine sprites.
```

## 6. 新ザコモンスターB、NPC、船 3x3シート

切り出し後のファイル名:
`icedevil`, `snowghost`, `hellhound`, `archdemon`, `blackdragon`, `darkmage`, `king`, `sister`, `ship`

```text
Create one 1024x1024 PNG image.
Style: 16-bit retro JRPG pixel art, inspired by classic Dragon Quest and SNES fantasy RPG sprites.

Canvas layout:
- Divide the image into a 3x3 grid of equal square cells.
- Draw thick bright red (#FF0000) grid lines between the cells.
- Every cell must have a pure white background.
- Each cell must contain exactly one subject.
- The subject must be centered, fully visible, and fully inside the cell.
- Do not let any subject touch or overlap the red grid lines.
- No text, no labels, no shadows, no transparent background.

Cells in order, left to right, top to bottom:
1. An ice devil with frost-blue skin, icicle horns, and frozen wings, facing the viewer.
2. A ghostly spirit made of swirling snow and blizzard wind, facing the viewer.
3. A three-eyed black hellhound with flaming paws, snarling, facing the viewer.
4. An arch demon with four arms, crimson skin, and a burning halo, facing the viewer.
5. A massive black dragon with obsidian scales and purple flame breath, facing the viewer.
6. An evil dark sorcerer in a tattered black hooded robe with a bone staff, facing the viewer.
7. A kind old king with a golden crown and red royal mantle, friendly NPC, facing the viewer.
8. A young church sister nun in a white-and-teal habit, friendly NPC, facing the viewer.
9. A small wooden sailing ship with one white sail, side view facing left.

Important:
- Make every subject visually distinct and readable at game size.
- The ship must be a side-view sprite facing left.
- Keep the style consistent across all nine sprites.
```

## 7. 追加ダンジョンタイル 3x3シート

切り出し後のファイル名:
`floor_pyramid`, `wall_pyramid`, `floor_volcano`, `wall_volcano`, `floor_altar`, `wall_altar`, `lava`

8番と9番は予備素材として必要なら使ってください。
タイルは `rpg-kit/tools/slice_tiles.py` で切り出します。

```text
Create one 1024x1024 PNG image.
Style: 16-bit retro JRPG pixel art tileset, top-down orthographic view, inspired by classic Dragon Quest and SNES Final Fantasy dungeon tiles.

Canvas layout:
- Divide the image into a 3x3 grid of 9 equal square cells.
- Draw thin bright red (#FF0000) grid lines between the cells.
- Each cell must contain exactly one seamless tileable terrain texture.
- Each texture must completely fill its cell from edge to edge.
- No white background.
- No inner border inside the cells.
- No central single object.
- No characters, no monsters, no text, no labels, no shadows.
- Every texture must reach all four edges and be evenly repeatable when tiled.
- Use flat top-down ground or wall textures only.

Cells in order, left to right, top to bottom:
1. Golden sandstone floor tiles with faint hieroglyph carvings.
2. Golden sandstone brick wall with hieroglyph carvings.
3. Dark volcanic rock floor with thin glowing magma cracks.
4. Rough black-red volcanic rock wall.
5. Mystical pale lavender stone floor with a faint star pattern.
6. Mystical pale lavender stone brick wall with glowing runes.
7. Bright molten lava surface with bubbling orange and yellow swirls.
8. Cracked dark obsidian ground.
9. Deep blue starry night sky texture.

Important:
- These are textures, not object sprites.
- The textures must be tileable and should look good when repeated.
```

## 8. 追加戦闘背景 1枚目

切り出し後のファイル名:
上半分 `bg_desert`、下半分 `bg_volcano`

```text
Create one 1024x1024 PNG image.
Style: 16-bit retro JRPG pixel art battle backgrounds, inspired by classic Dragon Quest and SNES fantasy RPG battle scenes.

Canvas layout:
- Split the image into a top half and a bottom half.
- Separate the two halves with one thick bright red (#FF0000) horizontal line.
- Each half must be a wide scenic battle background.
- No characters, no monsters, no text, no labels, no UI, no shadows.

Top half:
A vast golden desert with rolling dunes and a distant pyramid under a blazing sky.

Bottom half:
The fiery interior of a volcano with rivers of glowing lava and dark rock.

Important:
- Make both backgrounds readable as battle backdrop images.
- Keep the horizon and scenery wide, like a classic RPG battle background.
```

## 9. 追加戦闘背景 2枚目

切り出し後のファイル名:
上半分 `bg_sea`、下半分 `bg_dark`

```text
Create one 1024x1024 PNG image.
Style: 16-bit retro JRPG pixel art battle backgrounds, inspired by classic Dragon Quest and SNES fantasy RPG battle scenes.

Canvas layout:
- Split the image into a top half and a bottom half.
- Separate the two halves with one thick bright red (#FF0000) horizontal line.
- Each half must be a wide scenic battle background.
- No characters, no monsters, no text, no labels, no UI, no shadows.

Top half:
The open ocean seen from a ship's deck, with rolling blue waves, distant islands, and seabirds.

Bottom half:
An ominous dark castle hall with purple flames in braziers and tall black pillars.

Important:
- Make both backgrounds readable as battle backdrop images.
- Keep the horizon and scenery wide, like a classic RPG battle background.
```

## 10. タイトルロゴII

保存ファイル名:
`logo2`

```text
Create one 1024x1024 PNG image.
Style: retro JRPG game logo illustration, clean pixel art style, inspired by classic fantasy RPG title screen artwork.

Canvas layout:
- Use a pure white background.
- Place the illustration in the center.
- The full illustration must be visible and fully inside the image.
- No text, no letters, no labels, no shadows, no transparent background.

Subject:
A legendary glowing sword crossed with a dark demonic sword, surrounded by five floating star fragments glowing in different colors: red, green, gold, orange, and ice-blue. The composition should feel epic, magical, and suitable for a fantasy RPG title screen.

Important:
- Do not include the game title as text.
- Make the swords and star fragments crisp, readable, and game-ready.
```

## 優先度まとめ

| 優先度 | シート | 枚数 | 効果 |
|---|---:|---:|---|
| 最高 | 仲間キャラ3人 | 1 | 仲間が仮画像ではなくなり、ゲームの印象が大きく上がる |
| 高 | 新ボスA、新ボスB、ノワール真の姿 | 3 | ボスが固有デザインになり、見た目の達成感が出る |
| 高 | 新ザコモンスターA/B、NPC、船 | 2 | 海、砂漠、火山、雪、城の敵とNPCが固有になる |
| 中 | ダンジョンタイル | 1 | ピラミッド、火山、祭壇などのマップ表現が固有になる |
| 中 | 戦闘背景 | 2 | 砂漠、火山、海、暗黒城の戦闘背景が表現できる |
| 低 | タイトルロゴII | 1 | タイトル画面を豪華にできる |

合計10枚です。
