import { ApiClient, ApiClientError } from './ApiClient';

describe('ApiClient (MCP)', () => {
  const response = (status: number, body: unknown = {}): Response =>
    ({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    }) as Response;

  const buildFetch = (
    value: Response,
  ): jest.Mock<Promise<Response>, [string, RequestInit?]> =>
    jest.fn<Promise<Response>, [string, RequestInit?]>().mockResolvedValue(value);

  it('autentica con la cabecera X-Api-Key', async () => {
    const fetchFn = buildFetch(response(200, { ok: true }));
    const client = new ApiClient(
      'http://api.test',
      'wb_x_y',
      fetchFn as unknown as typeof fetch,
    );

    await client.request('GET', '/api/admin/tenants');

    expect(fetchFn.mock.calls[0]?.[0]).toBe('http://api.test/api/admin/tenants');
    expect(fetchFn.mock.calls[0]?.[1]?.headers).toMatchObject({ 'X-Api-Key': 'wb_x_y' });
  });

  it('no manda Content-Type cuando no hay cuerpo', async () => {
    const fetchFn = buildFetch(response(200));
    const client = new ApiClient(
      'http://api.test',
      'k',
      fetchFn as unknown as typeof fetch,
    );

    await client.request('GET', '/x');

    expect(fetchFn.mock.calls[0]?.[1]?.headers).not.toHaveProperty('Content-Type');
  });

  it('resuelve un 204 sin intentar parsear cuerpo', async () => {
    const fetchFn = buildFetch({ ok: true, status: 204 } as Response);
    const client = new ApiClient(
      'http://api.test',
      'k',
      fetchFn as unknown as typeof fetch,
    );

    await expect(client.request('DELETE', '/x')).resolves.toBeUndefined();
  });

  it('convierte un error de validación en la lista de campos que el agente debe corregir', async () => {
    const fetchFn = buildFetch(
      response(400, {
        error: 'ValidationError',
        issues: [
          { path: 'palette.primary', message: 'Usa un color en formato hexadecimal' },
          { path: 'typography.pairing', message: 'Opción inválida' },
        ],
      }),
    );
    const client = new ApiClient(
      'http://api.test',
      'k',
      fetchFn as unknown as typeof fetch,
    );

    await expect(client.request('PATCH', '/x', {})).rejects.toThrow(
      /palette\.primary: Usa un color en formato hexadecimal[\s\S]*typography\.pairing/,
    );
  });

  it('usa el mensaje de la API cuando viene uno', async () => {
    const fetchFn = buildFetch(
      response(403, {
        error: 'Forbidden',
        message: 'Tu clave no alcanza a este cliente.',
      }),
    );
    const client = new ApiClient(
      'http://api.test',
      'k',
      fetchFn as unknown as typeof fetch,
    );

    await expect(client.request('GET', '/x')).rejects.toThrow(
      'Tu clave no alcanza a este cliente.',
    );
  });

  it('explica los códigos comunes aunque la API no mande mensaje', async () => {
    for (const [status, expected] of [
      [401, /inválida, revocada o vencida/],
      [403, /no tiene permiso/],
      [404, /No se encontró/],
    ] as const) {
      const fetchFn = buildFetch(response(status, {}));
      const client = new ApiClient(
        'http://api.test',
        'k',
        fetchFn as unknown as typeof fetch,
      );
      await expect(client.request('GET', '/x')).rejects.toThrow(expected);
    }
  });

  it('conserva el código HTTP en el error, para poder distinguirlo', async () => {
    const fetchFn = buildFetch(response(429, { message: 'Demasiadas peticiones.' }));
    const client = new ApiClient(
      'http://api.test',
      'k',
      fetchFn as unknown as typeof fetch,
    );

    await expect(client.request('GET', '/x')).rejects.toMatchObject({
      name: 'ApiClientError',
      status: 429,
    });
    expect(new ApiClientError('x', 429).status).toBe(429);
  });
});
