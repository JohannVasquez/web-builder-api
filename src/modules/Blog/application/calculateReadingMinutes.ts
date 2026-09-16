import type { BlogBlock, BlogContent } from '../domain/BlogPostContentSchema';

const WORDS_PER_MINUTE = 200;

const textOf = (block: BlogBlock): string => {
  switch (block.type) {
    case 'paragraph':
    case 'heading':
    case 'quote':
      return block.text;
    case 'list':
      return block.items.join(' ');
    case 'image':
      return block.alt;
    case 'video':
      return block.caption ?? '';
    case 'divider':
      return '';
  }
};

// Pura y exportada para poder testearla sin tocar la base de datos: nunca se guarda,
// se recalcula en cada lectura a partir del `content` (AC de la épica).
export const calculateReadingMinutes = (content: BlogContent): number => {
  const words = content
    .map(textOf)
    .join(' ')
    .split(/\s+/)
    .filter((word) => word.length > 0);
  return Math.max(1, Math.ceil(words.length / WORDS_PER_MINUTE));
};
