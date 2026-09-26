export class ConflictError extends Error {
  constructor(
    message: string,
    public readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = 'ConflictError';
  }
}
