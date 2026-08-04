import { describe, expect, it } from 'vitest';
import { validateDialogueFile, DialogueError } from '../../src/domain/progress/dialogue';
import ch1 from '../../src/content/data/dialogue/ch1.json';
import ch2 from '../../src/content/data/dialogue/ch2.json';
import speakers from '../../src/content/data/speakers.json';

const KNOWN = new Set(Object.keys(speakers));

describe('shipped dialogue validates', () => {
  it('ch1.json passes: links, speakers, no orphans, no dead ends', () => {
    const graphs = validateDialogueFile(ch1, KNOWN);
    expect(Object.keys(graphs)).toContain('ch1_intro');
    expect(Object.keys(graphs)).toContain('ch1_aftermath');
  });

  it('ch2.json passes and completes the chapter', () => {
    const graphs = validateDialogueFile(ch2, KNOWN);
    const flags = Object.values(graphs['ch2_aftermath']!.nodes).flatMap((n) => n.setFlags ?? []);
    expect(flags).toContain('ch2.complete');
    expect(flags).toContain('pin.spice');
    const fragment = Object.values(graphs['spice_debtbook']!.nodes).flatMap((n) => n.setFlags ?? []);
    expect(fragment).toContain('undertide.ch2');
  });

  it('ch1 aftermath sets the chapter-complete flags', () => {
    const graphs = validateDialogueFile(ch1, KNOWN);
    const flags = Object.values(graphs['ch1_aftermath']!.nodes).flatMap((n) => n.setFlags ?? []);
    expect(flags).toContain('ch1.complete');
    expect(flags).toContain('pin.gulls');
  });
});

describe('dialogue validation rejects broken graphs', () => {
  const base = {
    g: { start: 'a', nodes: { a: { speaker: 'tero', text: 'hi', end: true } } },
  };

  it('accepts the minimal valid graph', () => {
    expect(() => validateDialogueFile(base, KNOWN)).not.toThrow();
  });

  it('rejects unknown speakers', () => {
    const bad = { g: { start: 'a', nodes: { a: { speaker: 'nobody', text: 'x', end: true } } } };
    expect(() => validateDialogueFile(bad, KNOWN)).toThrow(DialogueError);
  });

  it('rejects broken links', () => {
    const bad = { g: { start: 'a', nodes: { a: { speaker: 'tero', text: 'x', next: 'missing' } } } };
    expect(() => validateDialogueFile(bad, KNOWN)).toThrow(DialogueError);
  });

  it('rejects orphan nodes', () => {
    const bad = {
      g: {
        start: 'a',
        nodes: {
          a: { speaker: 'tero', text: 'x', end: true },
          orphan: { speaker: 'tero', text: 'y', end: true },
        },
      },
    };
    expect(() => validateDialogueFile(bad, KNOWN)).toThrow(DialogueError);
  });

  it('rejects dead ends not marked end', () => {
    const bad = { g: { start: 'a', nodes: { a: { speaker: 'tero', text: 'x' } } } };
    expect(() => validateDialogueFile(bad, KNOWN)).toThrow(DialogueError);
  });

  it('rejects choice counts other than two', () => {
    const bad = {
      g: {
        start: 'a',
        nodes: {
          a: {
            speaker: 'tero',
            text: 'x',
            choices: [{ text: 'only one', next: 'b' }],
          },
          b: { speaker: 'tero', text: 'y', end: true },
        },
      },
    };
    expect(() => validateDialogueFile(bad, KNOWN)).toThrow(DialogueError);
  });
});
