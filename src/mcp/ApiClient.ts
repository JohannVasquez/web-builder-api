export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

interface ErrorBody {
  readonly error?: string;
  readonly message?: string;
  readonly issues?: readonly { readonly path: string; readonly message: string }[];
  readonly retryAfterSeconds?: number;
}

// Cliente HTTP del MCP contra la misma API que usa el panel: si algo no se puede hacer
// por aquí, tampoco se puede desde el panel, y al revés.
export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  public async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await this.fetchFn(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'X-Api-Key': this.apiKey,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ApiClientError(this.explain(payload, response.status), response.status);
    }
    return payload as T;
  }

  // Traduce el error al lenguaje que necesita un agente: qué campo está mal y por qué,
  // para que pueda corregirlo solo sin preguntarle a nadie (Spec 10.4).
  private explain(payload: unknown, status: number): string {
    const body = (payload ?? {}) as ErrorBody;

    if (body.issues !== undefined && body.issues.length > 0) {
      const detail = body.issues
        .map(
          (issue) => `  - ${issue.path === '' ? '(raíz)' : issue.path}: ${issue.message}`,
        )
        .join('\n');
      return `El contenido enviado no es válido. Corrige estos campos y reintenta:\n${detail}`;
    }

    if (body.message !== undefined && body.message !== '') {
      return body.message;
    }

    if (status === 401) {
      return 'Clave de acceso inválida, revocada o vencida.';
    }
    if (status === 403) {
      return 'Tu clave de acceso no tiene permiso para esta acción.';
    }
    if (status === 404) {
      return 'No se encontró el recurso pedido.';
    }
    return `La API respondió ${status}.`;
  }
}
