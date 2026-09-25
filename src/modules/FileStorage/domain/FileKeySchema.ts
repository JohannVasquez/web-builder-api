import { z } from 'zod';

export const FILE_KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$/i;

/**
 * Las keys siempre tienen la forma `<uuid><extensión>` (generadas por
 * `UploadFileUseCase`); cualquier otra cosa se rechaza antes de llegar
 * al proveedor de storage.
 */
export const FileKeySchema = z
  .string()
  .regex(
    FILE_KEY_PATTERN,
    'La key debe tener el formato <uuid>.<extensión>',
  );
