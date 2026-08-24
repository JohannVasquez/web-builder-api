import { BadRequestError } from '../../../shared/domain/BadRequestError';

export class MissingFileError extends BadRequestError {
  constructor() {
    super('Se requiere un archivo en el campo "file" (multipart/form-data).');
    this.name = 'MissingFileError';
  }
}
