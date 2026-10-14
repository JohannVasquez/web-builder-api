import express, { type Express, type RequestHandler } from 'express';
import request from 'supertest';
import { Tenant } from '@/modules/Tenant/domain/Tenant';
import { markDemoRequest } from '@/shared/presentation/demoRequest';
import type { GetPageBySlugUseCase } from '../application/GetPageBySlugUseCase';
import type { ListPublishedPagesUseCase } from '../application/ListPublishedPagesUseCase';
import { Page } from '../domain/Page';
import { PageController } from './PageController';
import { createPageRouter } from './pageRouter';

describe('PageController (demos)', () => {
  const tenant = new Tenant(
    '018f6f1a-0000-7000-8000-0000000000e1',
    'demo-luna',
    'Luna',
    null,
    'demo',
  );

  const build = (
    asDemo: boolean,
    withPreview = false,
  ): { app: Express; getPage: jest.Mock; listPages: jest.Mock } => {
    const getPage = jest.fn().mockResolvedValue(new Page('home', 'Inicio', null, []));
    const listPages = jest.fn().mockResolvedValue([
      {
        slug: 'home',
        title: 'Inicio',
        description: null,
        updatedAt: null,
        noindex: false,
      },
    ]);
    const controller = new PageController(
      { execute: getPage } as unknown as GetPageBySlugUseCase,
      { execute: listPages } as unknown as ListPublishedPagesUseCase,
    );
    const context: RequestHandler = (_req, res, next) => {
      (res.locals as { tenant?: Tenant; isPreview?: boolean }).tenant = tenant;
      (res.locals as { isPreview?: boolean }).isPreview = withPreview;
      if (asDemo) {
        markDemoRequest(res, {
          demoId: '018f6f1a-0000-7000-8000-0000000000d1',
          kind: 'team',
        });
      }
      next();
    };
    const app = express();
    app.use('/api/pages', context, createPageRouter(controller));
    return { app, getPage, listPages };
  };

  it('el sitemap de una demo nunca lista páginas, ni con enlace válido', async () => {
    const { app, listPages } = build(true);

    const response = await request(app).get('/api/pages');

    expect(response.body).toEqual({ pages: [] });
    expect(listPages).not.toHaveBeenCalled();
  });

  it('una página de demo sale marcada noindex', async () => {
    const { app } = build(true);

    const response = await request(app).get('/api/pages/home');

    expect((response.body as { noindex: boolean }).noindex).toBe(true);
  });

  it('una demo sirve lo publicado aunque llegue también un enlace de revisión', async () => {
    const { app, getPage } = build(true, true);

    const response = await request(app).get('/api/pages/home');

    expect(getPage).toHaveBeenCalledWith(tenant.id, 'home', false);
    expect((response.body as { _isPreview: boolean })._isPreview).toBe(false);
  });

  it('fuera de una demo, el listado y la vista previa siguen igual', async () => {
    const { app, getPage } = build(false, true);

    const [list, page] = await Promise.all([
      request(app).get('/api/pages'),
      request(app).get('/api/pages/home'),
    ]);

    expect((list.body as { pages: unknown[] }).pages).toHaveLength(1);
    expect(getPage).toHaveBeenCalledWith(tenant.id, 'home', true);
    expect((page.body as { noindex: boolean }).noindex).toBe(false);
  });
});
