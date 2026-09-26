import {
  generateApiKeyToken,
  hashApiKeyToken,
  looksLikeApiKeyToken,
} from './apiKeyToken';

describe('generateApiKeyToken', () => {
  it('returns a token starting with wb_ that contains its own prefix', () => {
    const generated = generateApiKeyToken();

    expect(generated.token.startsWith('wb_')).toBe(true);
    expect(generated.token).toContain(generated.prefix);
  });

  it('never returns the same token or prefix twice', () => {
    const first = generateApiKeyToken();
    const second = generateApiKeyToken();

    expect(first.token).not.toBe(second.token);
    expect(first.prefix).not.toBe(second.prefix);
  });
});

describe('hashApiKeyToken', () => {
  it('is deterministic for the same token', () => {
    const generated = generateApiKeyToken();

    expect(hashApiKeyToken(generated.token)).toBe(hashApiKeyToken(generated.token));
  });

  it('differs for different tokens', () => {
    const first = generateApiKeyToken();
    const second = generateApiKeyToken();

    expect(hashApiKeyToken(first.token)).not.toBe(hashApiKeyToken(second.token));
  });

  it('never contains the original token', () => {
    const generated = generateApiKeyToken();

    expect(hashApiKeyToken(generated.token)).not.toContain(generated.token);
  });
});

describe('looksLikeApiKeyToken', () => {
  it('recognizes an api key token and rejects a JWT', () => {
    const generated = generateApiKeyToken();
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature';

    expect(looksLikeApiKeyToken(generated.token)).toBe(true);
    expect(looksLikeApiKeyToken(jwt)).toBe(false);
  });
});
