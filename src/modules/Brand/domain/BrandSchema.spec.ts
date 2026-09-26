import { BrandSchema, BrandUpdateSchema } from './BrandSchema';

describe('BrandSchema', () => {
  it('parses {} into the documented defaults', () => {
    const brand = BrandSchema.parse({});

    expect(brand).toEqual({
      palette: {},
      typography: { pairing: 'inter', scale: 'normal' },
      assets: {},
      colorMode: 'system',
      visualStyle: 'classic',
    });
  });

  it('accepts 3-digit and 6-digit hex colors', () => {
    expect(() => BrandSchema.parse({ palette: { primary: '#abc' } })).not.toThrow();
    expect(() => BrandSchema.parse({ palette: { primary: '#1d4ed8' } })).not.toThrow();
  });

  it.each(['rojo', 'rgb(1,2,3)', '#12345'])('rejects a non-hex color %s', (value) => {
    expect(() => BrandSchema.parse({ palette: { primary: value } })).toThrow();
  });

  it('rejects a pairing outside the catalog', () => {
    expect(() => BrandSchema.parse({ typography: { pairing: 'comic-sans' } })).toThrow();
  });

  it('rejects an invalid scale', () => {
    expect(() => BrandSchema.parse({ typography: { scale: 'huge' } })).toThrow();
  });

  it('rejects a visualStyle with uppercase letters or spaces', () => {
    expect(() => BrandSchema.parse({ visualStyle: 'Classic' })).toThrow();
    expect(() => BrandSchema.parse({ visualStyle: 'neo brutalism' })).toThrow();
  });

  it('accepts a lowercase, hyphenated visualStyle like neo-brutalism', () => {
    expect(() => BrandSchema.parse({ visualStyle: 'neo-brutalism' })).not.toThrow();
  });

  it('rejects an unknown top-level key', () => {
    expect(() => BrandSchema.parse({ unknownKey: true })).toThrow();
  });
});

describe('BrandUpdateSchema', () => {
  it('accepts an empty object', () => {
    expect(() => BrandUpdateSchema.parse({})).not.toThrow();
  });

  it('accepts updating a single section, like colorMode alone', () => {
    const update = BrandUpdateSchema.parse({ colorMode: 'dark' });

    expect(update).toMatchObject({ colorMode: 'dark' });
  });

  it('leaves out of a partial update every field the caller did not send', () => {
    expect(BrandUpdateSchema.parse({ colorMode: 'dark' })).toEqual({ colorMode: 'dark' });
    expect(BrandUpdateSchema.parse({})).toEqual({});
  });
});
