import express, { type Express } from 'express';
import request from 'supertest';
import { AdminPageController } from './AdminPageController';
import { createAdminPageRouter } from './adminPageRouter';
import { ListPagesUseCase } from '../application/ListPagesUseCase';
import { GetPageByIdUseCase } from '../application/GetPageByIdUseCase';
import { CreatePageUseCase } from '../application/CreatePageUseCase';
import { UpdatePageUseCase } from '../application/UpdatePageUseCase';
import { DeletePageUseCase } from '../application/DeletePageUseCase';
import { AddSectionUseCase } from '../application/AddSectionUseCase';
import { UpdateSectionUseCase } from '../application/UpdateSectionUseCase';
import { DuplicateSectionUseCase } from '../application/DuplicateSectionUseCase';
import { DeleteSectionUseCase } from '../application/DeleteSectionUseCase';
import { ReorderSectionsUseCase } from '../application/ReorderSectionsUseCase';
import { PublishPageUseCase } from '../application/PublishPageUseCase';
import { ListPageVersionsUseCase } from '../application/ListPageVersionsUseCase';
import { RestorePageVersionUseCase } from '../application/RestorePageVersionUseCase';
import { RecordPageVersionUseCase } from '../application/RecordPageVersionUseCase';
import type { PageVersionRepository } from '../domain/PageVersionRepository';
import { setRequestActor } from '../../ApiKey/presentation/actorMiddleware';
import { Page, PageSection } from '../domain/Page';
import { PageIdNotFoundError } from '../domain/PageIdNotFoundError';
import { PageSlugConflictError } from '../domain/PageSlugConflictError';
import { SectionPositionConflictError } from '../domain/SectionPositionConflictError';
import { ReorderMismatchError } from '../domain/ReorderMismatchError';
import type { PageRepository } from '../domain/PageRepository';
import { ErrorHandler } from '../../../shared/presentation/ErrorHandler';

describe('AdminPageController (HTTP)', () => {
  const buildPage = (): Page =>
    new Page(
      'home',
      'Inicio',
      null,
      [new PageSection('Hero', 1, { title: 'Hola' }, null, 10)],
      5,
      true,
    );

  const buildRepository = (): jest.Mocked<PageRepository> => ({
    findPublishedAt: jest.fn().mockResolvedValue(null),
    findBySlug: jest.fn(),
    findAllByTenant: jest.fn().mockResolvedValue([buildPage()]),
    findById: jest.fn().mockResolvedValue(buildPage()),
    create: jest.fn().mockResolvedValue(buildPage()),
    update: jest.fn().mockResolvedValue(buildPage()),
    delete: jest.fn().mockResolvedValue(undefined),
    publish: jest.fn(),
    replaceDraft: jest.fn(),
    addSection: jest.fn().mockResolvedValue(buildPage()),
    updateSection: jest.fn().mockResolvedValue(buildPage()),
    duplicateSection: jest.fn().mockResolvedValue(buildPage()),
    deleteSection: jest.fn().mockResolvedValue(buildPage()),
    reorderSections: jest.fn().mockResolvedValue(buildPage()),
  });

  const versionRepository: jest.Mocked<PageVersionRepository> = {
    record: jest.fn().mockResolvedValue(undefined),
    list: jest.fn().mockResolvedValue([]),
    findSnapshot: jest.fn().mockResolvedValue(null),
    markPublished: jest.fn().mockResolvedValue(undefined),
  };

  const buildApp = (repository: PageRepository): Express => {
    const controller = new AdminPageController(
      new ListPagesUseCase(repository),
      new GetPageByIdUseCase(repository),
      new CreatePageUseCase(repository),
      new UpdatePageUseCase(repository),
      new DeletePageUseCase(repository),
      new AddSectionUseCase(repository),
      new UpdateSectionUseCase(repository),
      new DuplicateSectionUseCase(repository),
      new DeleteSectionUseCase(repository),
      new ReorderSectionsUseCase(repository),
      new PublishPageUseCase(repository, versionRepository),
      new ListPageVersionsUseCase(versionRepository),
      new RestorePageVersionUseCase(repository, versionRepository),
      new RecordPageVersionUseCase(versionRepository),
    );
    const app = express();
    app.use(express.json());
    app.use((_req, res, next) => {
      setRequestActor(res, {
        type: 'admin',
        id: 1,
        name: 'Admin',
        role: 'owner',
        permission: 'full',
        tenantScope: null,
        rateLimitPerMinute: null,
      });
      next();
    });
    app.use('/api/admin/tenants/:tenantId/pages', createAdminPageRouter(controller));
    app.use(new ErrorHandler().handle);
    return app;
  };

  it('lists the pages of the tenant in the route, with ids', async () => {
    const repository = buildRepository();
    const app = buildApp(repository);

    const response = await request(app).get('/api/admin/tenants/3/pages');

    expect(response.status).toBe(200);
    expect(repository.findAllByTenant).toHaveBeenCalledWith(3);
    expect(response.body).toMatchObject({
      pages: [
        expect.objectContaining({
          id: 5,
          slug: 'home',
          sections: [expect.objectContaining({ id: 10, type: 'Hero' })],
        }),
      ],
    });
  });

  it('creates a page and returns 201', async () => {
    const repository = buildRepository();
    const app = buildApp(repository);

    const response = await request(app)
      .post('/api/admin/tenants/3/pages')
      .send({ slug: 'nueva-pagina', title: 'Nueva página' });

    expect(response.status).toBe(201);
    expect(repository.create).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ slug: 'nueva-pagina', title: 'Nueva página' }),
    );
  });

  it('returns 400 when the slug is already used in this tenant', async () => {
    const repository = buildRepository();
    repository.create.mockRejectedValue(new PageSlugConflictError('home'));
    const app = buildApp(repository);

    const response = await request(app)
      .post('/api/admin/tenants/3/pages')
      .send({ slug: 'home', title: 'Duplicada' });

    expect(response.status).toBe(400);
  });

  it('returns 400 for an invalid slug format instead of hitting the repository', async () => {
    const repository = buildRepository();
    const app = buildApp(repository);

    const response = await request(app)
      .post('/api/admin/tenants/3/pages')
      .send({ slug: 'Slug Inválido', title: 'x' });

    expect(response.status).toBe(400);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('returns 404 when the page does not belong to this tenant', async () => {
    const repository = buildRepository();
    repository.findById.mockRejectedValue(new PageIdNotFoundError(999));
    const app = buildApp(repository);

    const response = await request(app).get('/api/admin/tenants/3/pages/999');

    expect(response.status).toBe(404);
  });

  it('updates page metadata', async () => {
    const repository = buildRepository();
    const app = buildApp(repository);

    const response = await request(app)
      .patch('/api/admin/tenants/3/pages/5')
      .send({ title: 'Nuevo título' });

    expect(response.status).toBe(200);
    expect(repository.update).toHaveBeenCalledWith(3, 5, { title: 'Nuevo título' });
  });

  it('deletes a page and returns 204', async () => {
    const repository = buildRepository();
    const app = buildApp(repository);

    const response = await request(app).delete('/api/admin/tenants/3/pages/5');

    expect(response.status).toBe(204);
    expect(repository.delete).toHaveBeenCalledWith(3, 5);
  });

  it('adds a section with arbitrary props, validated only structurally', async () => {
    const repository = buildRepository();
    const app = buildApp(repository);

    const response = await request(app)
      .post('/api/admin/tenants/3/pages/5/sections')
      .send({ type: 'Hero', position: 1, props: { title: 'Hola', nested: { a: 1 } } });

    expect(response.status).toBe(201);
    expect(repository.addSection).toHaveBeenCalledWith(
      3,
      5,
      expect.objectContaining({ type: 'Hero', position: 1 }),
    );
  });

  it('returns 400 when the section position is already taken on that page', async () => {
    const repository = buildRepository();
    repository.addSection.mockRejectedValue(new SectionPositionConflictError(1));
    const app = buildApp(repository);

    const response = await request(app)
      .post('/api/admin/tenants/3/pages/5/sections')
      .send({ type: 'Hero', position: 1, props: {} });

    expect(response.status).toBe(400);
  });

  it('deletes a section', async () => {
    const repository = buildRepository();
    const app = buildApp(repository);

    const response = await request(app).delete(
      '/api/admin/tenants/3/pages/5/sections/10',
    );

    expect(response.status).toBe(200);
    expect(repository.deleteSection).toHaveBeenCalledWith(3, 5, 10);
  });

  it('reorders sections by id list', async () => {
    const repository = buildRepository();
    const app = buildApp(repository);

    const response = await request(app)
      .put('/api/admin/tenants/3/pages/5/sections/reorder')
      .send({ sectionIds: [10, 20, 30] });

    expect(response.status).toBe(200);
    expect(repository.reorderSections).toHaveBeenCalledWith(3, 5, [10, 20, 30]);
  });

  it('returns 400 when the reorder list does not match the page sections', async () => {
    const repository = buildRepository();
    repository.reorderSections.mockRejectedValue(new ReorderMismatchError());
    const app = buildApp(repository);

    const response = await request(app)
      .put('/api/admin/tenants/3/pages/5/sections/reorder')
      .send({ sectionIds: [10] });

    expect(response.status).toBe(400);
  });
});
