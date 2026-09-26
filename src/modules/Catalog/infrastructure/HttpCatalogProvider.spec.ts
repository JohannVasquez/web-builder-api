import { CatalogConfig, HttpCatalogProvider } from './HttpCatalogProvider';

describe('HttpCatalogProvider', () => {
  const ok = (body: unknown): Response =>
    ({ ok: true, status: 200, json: () => Promise.resolve(body) }) as Response;

  const config = new CatalogConfig('http://web.test/api/catalog');

  it('reexpone lo que declara el frontend y le suma las tipografías', async () => {
    const fetchFn = jest
      .fn<Promise<Response>, [string, RequestInit?]>()
      .mockResolvedValue(ok({ blocks: [{ type: 'Hero' }], visualStyles: [] }));

    const catalog = (await new HttpCatalogProvider(config, fetchFn).get()) as {
      blocks: unknown[];
      fontPairings: unknown[];
    };

    expect(catalog.blocks).toHaveLength(1);
    expect(catalog.fontPairings.length).toBeGreaterThanOrEqual(10);
  });

  it('cachea: no le pega al frontend en cada consulta del agente', async () => {
    const fetchFn = jest
      .fn<Promise<Response>, [string, RequestInit?]>()
      .mockResolvedValue(ok({ blocks: [] }));
    const provider = new HttpCatalogProvider(config, fetchFn);

    await provider.get();
    await provider.get();

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('si el frontend está caído devuelve el catálogo marcado como incompleto, no un error', async () => {
    const fetchFn = jest
      .fn<Promise<Response>, [string, RequestInit?]>()
      .mockRejectedValue(new Error('ECONNREFUSED'));

    const catalog = (await new HttpCatalogProvider(config, fetchFn).get()) as {
      unavailable?: boolean;
      fontPairings: unknown[];
    };

    expect(catalog.unavailable).toBe(true);
    expect(catalog.fontPairings.length).toBeGreaterThan(0);
  });

  it('sin URL configurada no intenta llamar a nadie', async () => {
    const fetchFn = jest.fn<Promise<Response>, [string, RequestInit?]>();

    await new HttpCatalogProvider(new CatalogConfig(''), fetchFn).get();

    expect(fetchFn).not.toHaveBeenCalled();
  });
});
