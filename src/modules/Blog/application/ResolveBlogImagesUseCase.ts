import { StorageProvider } from '../../FileStorage/domain/StorageProvider';
import type { BlogBlock, BlogContent } from '../domain/BlogPostContentSchema';

const ABSOLUTE_URL = /^https?:\/\//;

// Los bloques del blog guardan `key`s, no URLs, igual que las secciones de una página.
// Se escribe aquí y no se reutiliza `ResolveImageUrlsUseCase` porque ese recorre props con
// nombres fijos (`imageUrl`, `images`) y el contenido del blog es una lista discriminada:
// forzarlo obligaría a renombrar el campo a algo que no significa lo que guarda.
export class ResolveBlogImagesUseCase {
  constructor(private readonly storageProvider: StorageProvider) {}

  public async signKey(key: string | null): Promise<string | null> {
    if (key === null || key === '' || ABSOLUTE_URL.test(key)) {
      return key;
    }
    return this.storageProvider.getPresignedUrl(key);
  }

  public async execute(content: BlogContent): Promise<BlogContent> {
    return Promise.all(content.map((block) => this.resolveBlock(block)));
  }

  private async resolveBlock(block: BlogBlock): Promise<BlogBlock> {
    if (block.type !== 'image') {
      return block;
    }
    const url = await this.signKey(block.key);
    return { ...block, key: url ?? block.key };
  }
}
