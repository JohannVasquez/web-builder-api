import { RateLimiter } from './RateLimiter';

describe('RateLimiter', () => {
  it('allows requests up to the limit and rejects the next one', () => {
    const rateLimiter = new RateLimiter();

    expect(rateLimiter.check('key', 2, 0).allowed).toBe(true);
    expect(rateLimiter.check('key', 2, 0).allowed).toBe(true);
    expect(rateLimiter.check('key', 2, 0).allowed).toBe(false);
  });

  it('reports a positive retryAfterSeconds when rejecting', () => {
    const rateLimiter = new RateLimiter();
    rateLimiter.check('key', 1, 0);

    const decision = rateLimiter.check('key', 1, 0);

    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('allows again once the 60s window has passed', () => {
    const rateLimiter = new RateLimiter();
    rateLimiter.check('key', 1, 0);
    rateLimiter.check('key', 1, 0);

    const decision = rateLimiter.check('key', 1, 60_001);

    expect(decision.allowed).toBe(true);
  });

  it('keeps quotas separate between different keys', () => {
    const rateLimiter = new RateLimiter();
    rateLimiter.check('key-a', 1, 0);

    const decision = rateLimiter.check('key-b', 1, 0);

    expect(decision.allowed).toBe(true);
  });
});
