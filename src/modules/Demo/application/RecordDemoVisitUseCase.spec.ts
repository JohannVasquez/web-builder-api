import { hashIp } from '@/modules/Consent/domain/ipHash';
import type { DemoRepository } from '../domain/DemoRepository';
import { RecordDemoVisitUseCase } from './RecordDemoVisitUseCase';

describe('RecordDemoVisitUseCase', () => {
  const DEMO_ID = '018f6f1a-0000-7000-8000-0000000000d1';
  const NOW = new Date('2026-09-26T12:00:00Z');

  const build = (
    recordVisit: jest.Mock = jest.fn().mockResolvedValue(undefined),
  ): { useCase: RecordDemoVisitUseCase; recordVisit: jest.Mock } => ({
    useCase: new RecordDemoVisitUseCase(
      { recordVisit } as unknown as DemoRepository,
      'sal-de-prueba',
    ),
    recordVisit,
  });

  it('guarda la página, la hora, la huella de la IP y el agente recortado; nunca la IP', async () => {
    const { useCase, recordVisit } = build();

    await useCase.execute(
      DEMO_ID,
      {
        pageSlug: 'precios',
        ip: '190.20.30.40',
        userAgent: `Mozilla/5.0 ${'x'.repeat(400)}`,
      },
      NOW,
    );

    const [demoId, visit] = recordVisit.mock.calls[0] as [
      string,
      { pageSlug: string; ipHash: string; userAgent: string; visitedAt: Date },
    ];
    expect(demoId).toBe(DEMO_ID);
    expect(visit.pageSlug).toBe('precios');
    expect(visit.visitedAt).toBe(NOW);
    expect(visit.ipHash).toBe(hashIp('190.20.30.40', 'sal-de-prueba'));
    expect(JSON.stringify(visit)).not.toContain('190.20.30.40');
    expect(visit.userAgent).toHaveLength(255);
  });

  it('sin sal no guarda huella, igual que el consentimiento', async () => {
    const recordVisit = jest.fn().mockResolvedValue(undefined);
    const useCase = new RecordDemoVisitUseCase(
      { recordVisit } as unknown as DemoRepository,
      '',
    );

    await useCase.execute(DEMO_ID, {
      pageSlug: 'home',
      ip: '1.2.3.4',
      userAgent: undefined,
    });

    expect(recordVisit).toHaveBeenCalledWith(
      DEMO_ID,
      expect.objectContaining({ ipHash: null, userAgent: null }),
    );
  });

  it('si la base falla no lanza: lo deja en el log', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { useCase } = build(jest.fn().mockRejectedValue(new Error('base caída')));

    await expect(
      useCase.execute(DEMO_ID, { pageSlug: 'home', ip: undefined, userAgent: undefined }),
    ).resolves.toBeUndefined();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
