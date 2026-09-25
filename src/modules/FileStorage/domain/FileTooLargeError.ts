import { PayloadTooLargeError } from '@/shared/domain/PayloadTooLargeError';

export class FileTooLargeError extends PayloadTooLargeError {
  constructor(maxFileSizeMb: number, actualSizeBytes?: number) {
    let msg = `El archivo excede el tamaño máximo permitido de ${maxFileSizeMb} MB.`;
    if (actualSizeBytes !== undefined) {
      const actualMb = (actualSizeBytes / (1024 * 1024)).toFixed(2);
      msg = `El archivo pesa ${actualMb} MB, excediendo el tamaño máximo permitido de ${maxFileSizeMb} MB.`;
    }
    super(msg);
    this.name = 'FileTooLargeError';
  }
}
