import { PayloadTooLargeError } from '@/shared/domain/PayloadTooLargeError';

export class FileTooLargeError extends PayloadTooLargeError {
  constructor(maxFileSizeMb: number) {
    super(`El archivo excede el tamaño máximo permitido de ${maxFileSizeMb} MB.`);
    this.name = 'FileTooLargeError';
  }
}
