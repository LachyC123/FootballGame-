import { describe, expect, it } from 'vitest';
import { validateStrings, validateTeams, ContentError } from '../../src/content/schemas';
import teamsJson from '../../src/content/data/teams.json';
import stringsJson from '../../src/content/data/strings.json';

describe('shipped content validates', () => {
  it('teams.json passes schema validation', () => {
    const teams = validateTeams(teamsJson);
    expect(teams.length).toBeGreaterThanOrEqual(2);
    expect(teams.map((t) => t.id)).toContain('team_gulls');
  });

  it('strings.json passes schema validation', () => {
    const strings = validateStrings(stringsJson);
    expect(strings['ui.title.name']).toBe('SOLPORT CAGES');
  });
});

describe('validators reject bad content', () => {
  it('rejects duplicate team ids', () => {
    const dupe = [teamsJson[0], teamsJson[0]];
    expect(() => validateTeams(dupe)).toThrow(ContentError);
  });

  it('rejects out-of-range AI profile values', () => {
    const bad = JSON.parse(JSON.stringify(teamsJson)) as Array<Record<string, unknown>>;
    (bad[0]!['aiProfile'] as Record<string, number>)['press'] = 2;
    expect(() => validateTeams(bad)).toThrow(ContentError);
  });

  it('rejects wrong team sizes', () => {
    const bad = JSON.parse(JSON.stringify(teamsJson)) as Array<Record<string, unknown>>;
    bad[0]!['players'] = [];
    expect(() => validateTeams(bad)).toThrow(ContentError);
  });

  it('rejects malformed string keys', () => {
    expect(() => validateStrings({ BadKey: 'x' })).toThrow(ContentError);
  });
});
