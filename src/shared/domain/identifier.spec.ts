import { isUuid, parseId } from './identifier';
import { BadRequestError } from './BadRequestError';

describe('identifier', () => {
  describe('isUuid', () => {
    it('returns true for a valid UUID v4', () => {
      expect(isUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    });

    it('returns true for a valid UUID v7', () => {
      expect(isUuid('018f6f1a-0000-7000-8000-000000000001')).toBe(true);
    });

    it('returns false for an invalid string', () => {
      expect(isUuid('not-a-uuid')).toBe(false);
    });
  });

  describe('parseId', () => {
    it('returns the valid UUID', () => {
      expect(parseId('018f6f1a-0000-7000-8000-000000000001', 'id')).toBe(
        '018f6f1a-0000-7000-8000-000000000001',
      );
    });

    it('throws BadRequestError for non-string', () => {
      expect(() => parseId(123, 'id')).toThrow(BadRequestError);
      expect(() => parseId(123, 'id')).toThrow('El identificador "id" no es válido.');
    });

    it('throws BadRequestError for invalid string', () => {
      expect(() => parseId('abc', 'id')).toThrow(BadRequestError);
    });
  });
});
