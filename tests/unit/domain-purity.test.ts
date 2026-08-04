import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * docs/05 §2 hard rule, CI enforcement half: src/domain must never import
 * Phaser or touch DOM/storage globals. (ESLint enforces the same rule live.)
 */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (full.endsWith('.ts')) out.push(full);
  }
  return out;
}

describe('domain purity', () => {
  const files = walk(join(process.cwd(), 'src', 'domain'));

  it('finds domain files to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((f) => [f]))('%s has no Phaser/DOM/storage usage', (file) => {
    const src = readFileSync(file, 'utf8');
    expect(src).not.toMatch(/from\s+['"]phaser/);
    expect(src).not.toMatch(/\bdocument\./);
    expect(src).not.toMatch(/\bwindow\./);
    expect(src).not.toMatch(/\blocalStorage\b/);
    expect(src).not.toMatch(/\bindexedDB\b/);
    expect(src).not.toMatch(/\bMath\.random\b/);
  });
});
