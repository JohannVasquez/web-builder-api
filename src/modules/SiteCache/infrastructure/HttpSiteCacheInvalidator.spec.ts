import { HttpSiteCacheInvalidator, SiteCacheConfig } from './HttpSiteCacheInvalidator';

describe('HttpSiteCacheInvalidator', () => {
  const config = new SiteCacheConfig('http://web.test/api/revalidate', 'secreto');
  const okResponse = { ok: true, status: 200 } as Response;

  it('avisa al frontend con los dominios y el secreto compartido', async () => {
    const fetchFn = jest
      .fn<Promise<Response>, [string, RequestInit?]>()
      .mockResolvedValue(okResponse);

    await new HttpSiteCacheInvalidator(config, fetchFn).invalidate(['acme.cl']);

    expect(fetchFn).toHaveBeenCalledWith('http://web.test/api/revalidate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Revalidate-Secret': 'secreto',
      },
      body: JSON.stringify({ domains: ['acme.cl'] }),
    });
  });

  it('no llama a nadie si la revalidación está apagada', async () => {
    const fetchFn = jest.fn<Promise<Response>, [string, RequestInit?]>();

    await new HttpSiteCacheInvalidator(new SiteCacheConfig('', ''), fetchFn).invalidate([
      'acme.cl',
    ]);

    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('no llama a nadie si no hay dominios que invalidar', async () => {
    const fetchFn = jest.fn<Promise<Response>, [string, RequestInit?]>();

    await new HttpSiteCacheInvalidator(config, fetchFn).invalidate([]);

    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('no propaga el fallo del frontend: el cambio ya está guardado', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetchFn = jest
      .fn<Promise<Response>, [string, RequestInit?]>()
      .mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(
      new HttpSiteCacheInvalidator(config, fetchFn).invalidate(['acme.cl']),
    ).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
