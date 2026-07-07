# 2bitArcade - Third-Party Licenses

## Radius Raid
- Author: Jack Rugile
- Source: https://github.com/jackrugile/radius-raid-js13k
- License: MIT (full text at public/rraid/LICENSE.md)
- Modifications: none to game code. Script paths adjusted in the host
  page; a bridge script adds leaderboard submission alongside the game.

## Bullet Hell
- Author: Amelia Clarke (selenebun)
- Source: https://github.com/selenebun/bullethell
- License: MIT (full text at public/bullethell/LICENSE)
- Bundled: p5.js (MIT). Game code unmodified; a bridge script adds
  leaderboard submission alongside the game.

## SpacePi
- Author: Jack Rugile
- Source: https://github.com/jackrugile/spacepi-js13k
- License: MIT (full text at public/spacepi/LICENSE.md)
- Modifications: ONE line - the game instance is exposed as `window.sp`
  (original: `var sp=new SpacePi;sp.initGame()`) so the leaderboard bridge
  can read cumulative level scores. Game logic otherwise unmodified.

## Lucky Alien
- Author: thcheetah777 (deltea)
- Source: https://github.com/thcheetah777/luckyalien
- License: MIT (full text at public/luckyalien/LICENSE.md)
- Bundled: Phaser 3 (MIT, via CDN); graphics by Kenney.nl (CC0).
- Modifications: the original bundled copyrighted background music
  (ripped Kirby soundtrack). Those four tracks (start/background/boss/
  credits) were REMOVED and replaced with original music. A bridge
  script adds leaderboard submission. Game logic otherwise unmodified.

## Neon Runner
- Original work by 2bit Developer (created for 2bitArcade).
- All code and art original (canvas-drawn); no third-party game assets.

## Origami Ascent / JumpFighter
- Original works by 2bit Developer.
