const fs = require('fs');
const txt = fs.readFileSync('constants.ts', 'utf8');
const lines = txt.split('\n');

const wordStyles = [
  'WORD_HORMOZI_FOCUS', 'WORD_BOLD_SPORTS', 'WORD_INSTA_POP',
  'WORD_FUTURE_NEON', 'WORD_GLITCH_CHAOS', 'WORD_NEON_STORM',
  'WORD_LYRICIST_OUTLINE', 'WORD_SOFT_GLOW', 'WORD_GRADIENT_DREAM',
  'WORD_TAPE_HIGHLIGHT', 'WORD_ACTIVE_BOX', 'WORD_GAME_STREAMER',
  'WORD_RETRO_PIXEL', 'WORD_LUXURY_SERIF', 'WORD_COMIC_IMPACT',
  'WORD_VLOG_AESTHETIC', 'WORD_NOIR_CRIME', 'WORD_SUPER_3D',
  'WORD_FIRE_POP', 'VIRAL_WORD_SLAM', 'WORD_CINEMATIC',
  'MINIMAL_WORD_FADE', 'WORD_GLITTER', 'NEON_WORD_WAVE',
  'WORD_SPOTLIGHT_REVEAL', 'WORD_SHAKE_IMPACT', 'WORD_OUTLINED_POP',
  'CAPCUT_CLASSIC', 'CAPCUT_BOLD_YELLOW', 'BOUNCE_WAVE',
  'RAINBOW_BURST', 'KARAOKE_FIRE', 'GRADIENT_SHIFT'
];

let replacedCount = 0;
const newLines = lines.map(line => {
  for (const style of wordStyles) {
    if (line.includes(`[CaptionStyle.${style}]`)) {
      if (line.includes('displayMode:"BLOCK"')) {
         replacedCount++;
         return line.replace('displayMode:"BLOCK"', 'displayMode:"WORD"');
      }
    }
  }
  return line;
});

fs.writeFileSync('constants.ts', newLines.join('\n'));
console.log('Replaced', replacedCount, 'lines in constants.ts');
