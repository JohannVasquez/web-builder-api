export class UnauthorizedError extends Error {
  constructor(message: string = 'No autenticado') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}
