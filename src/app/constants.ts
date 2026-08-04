// Internal render resolution — docs/03 §2. Matches are single-screen at this size.
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

// Fonts (Daniel Linssen, docs/07 §5). m5x7 is pixel-crisp at 16px multiples;
// m6x11plus at 22px multiples. Fallback chain covers missing glyphs (◈ ▸ —).
export const FONT_BODY = 'm5x7, monospace';
export const FONT_DISPLAY = 'm6x11plus, monospace';
export const FS_BODY = '16px';
export const FS_BODY_2X = '32px';
export const FS_DISPLAY = '22px';
export const FS_DISPLAY_2X = '44px';
