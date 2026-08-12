import type { Page } from './Page';

export interface PageRepository {
  findBySlug(slug: string): Promise<Page | null>;
}
