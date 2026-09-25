import { RecordSlugChangeUseCase, PAGE_PREFIX, BLOG_PREFIX, PRODUCT_PREFIX } from './RecordSlugChangeUseCase';
import { ManageRedirectsUseCase } from './ManageRedirectsUseCase';
import { RedirectRepository } from '../domain/RedirectRepository';
import { Redirect, type RedirectStatusCode } from '../domain/Redirect';

class InMemoryRedirectRepository extends RedirectRepository {
  public redirects: Redirect[] = [];

  public async listByTenant(_tenantId: string): Promise<Redirect[]> {
    await Promise.resolve();
    return this.redirects;
  }
  public async findByFrom(_tenantId: string, fromPath: string): Promise<Redirect | null> {
    await Promise.resolve();
    return this.redirects.find((r) => r.fromPath === fromPath) ?? null;
  }
  public async upsert(_tenantId: string, fromPath: string, toPath: string, statusCode: RedirectStatusCode): Promise<Redirect> {
    await Promise.resolve();
    const existing = this.redirects.find(r => r.fromPath === fromPath);
    if (existing) {
      const updated = new Redirect(existing.id, fromPath, toPath, statusCode, existing.createdAt);
      this.redirects = this.redirects.map(r => r.id === existing.id ? updated : r);
      return updated;
    }
    const created = new Redirect(Math.random().toString(), fromPath, toPath, statusCode, new Date());
    this.redirects.push(created);
    return created;
  }
  public async delete(_tenantId: string, id: string): Promise<void> {
    await Promise.resolve();
    this.redirects = this.redirects.filter(r => r.id !== id);
  }
}

describe('RecordSlugChangeUseCase', () => {
  let repository: InMemoryRedirectRepository;
  let useCase: RecordSlugChangeUseCase;

  beforeEach(() => {
    repository = new InMemoryRedirectRepository();
    useCase = new RecordSlugChangeUseCase(new ManageRedirectsUseCase(repository));
  });

  it('creación automática al cambiar el slug de una página', async () => {
    await useCase.execute('tenant', PAGE_PREFIX, 'viejo', 'nuevo');
    expect(repository.redirects).toHaveLength(1);
    expect(repository.redirects[0]?.fromPath).toBe('/viejo');
    expect(repository.redirects[0]?.toPath).toBe('/nuevo');
  });

  it('creación automática al cambiar el slug de un post', async () => {
    await useCase.execute('tenant', BLOG_PREFIX, 'viejo', 'nuevo');
    expect(repository.redirects).toHaveLength(1);
    expect(repository.redirects[0]?.fromPath).toBe('/blog/viejo');
    expect(repository.redirects[0]?.toPath).toBe('/blog/nuevo');
  });

  it('creación automática al cambiar el slug de un producto', async () => {
    await useCase.execute('tenant', PRODUCT_PREFIX, 'viejo', 'nuevo');
    expect(repository.redirects).toHaveLength(1);
    expect(repository.redirects[0]?.fromPath).toBe('/tienda/viejo');
    expect(repository.redirects[0]?.toPath).toBe('/tienda/nuevo');
  });

  it('colapso de cadena A→B→C', async () => {
    await useCase.execute('tenant', PAGE_PREFIX, 'a', 'b');
    await useCase.execute('tenant', PAGE_PREFIX, 'b', 'c');
    
    expect(repository.redirects).toHaveLength(2);
    expect(repository.redirects.find(r => r.fromPath === '/a')?.toPath).toBe('/c');
    expect(repository.redirects.find(r => r.fromPath === '/b')?.toPath).toBe('/c');
  });

  it('ciclo rechazado', async () => {
    await useCase.execute('tenant', PAGE_PREFIX, 'a', 'b');
    await useCase.execute('tenant', PAGE_PREFIX, 'b', 'a');
    
    expect(repository.redirects).toHaveLength(1);
    expect(repository.redirects.find(r => r.fromPath === '/b')).toBeUndefined();
  });

  it('redirección a sí misma rechazada', async () => {
    await useCase.execute('tenant', PAGE_PREFIX, 'a', 'a');
    expect(repository.redirects).toHaveLength(0);
  });
});
