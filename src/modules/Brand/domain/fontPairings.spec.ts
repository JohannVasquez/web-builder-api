import { DEFAULT_FONT_PAIRING_ID, FONT_PAIRINGS, findFontPairing } from './fontPairings';

describe('fontPairings', () => {
  it('has at least 10 pairings', () => {
    expect(FONT_PAIRINGS.length).toBeGreaterThanOrEqual(10);
  });

  it('has unique ids', () => {
    const ids = FONT_PAIRINGS.map((pairing) => pairing.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has a DEFAULT_FONT_PAIRING_ID present in the catalog', () => {
    expect(findFontPairing(DEFAULT_FONT_PAIRING_ID)).toBeDefined();
  });

  it('returns undefined for an unknown id', () => {
    expect(findFontPairing('does-not-exist')).toBeUndefined();
  });
});
