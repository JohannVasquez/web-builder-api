export class TooManyRequestsError extends Error {
  constructor(
    message: string,
    public readonly retryAfterSeconds: number,
  ) {
    super(message);
    this.name = 'TooManyRequestsError';
  }
}
