import { BadRequestError } from '@/shared/domain/BadRequestError';
import { NotFoundError } from '@/shared/domain/NotFoundError';
import type { DomainVerifier } from '../domain/DomainVerifier';
import { Tenant } from '../domain/Tenant';
import { TenantDomainRecord } from '../domain/TenantDomain';
import type { TenantRepository } from '../domain/TenantRepository';
import { ManageTenantUseCase, PlatformDomainConfig } from './ManageTenantUseCase';

describe('ManageTenantUseCase', () => {
  const tenant = new Tenant(
    '018f6f1a-0000-7000-8000-000000000007',
    'pasteleria',
    'Pastelería Luna',
    'pasteleria.cl',
  );
  const platform = new PlatformDomainConfig('webbuilder.co', 'sitios.webbuilder.co');

  const verifier = (published: boolean): jest.Mocked<DomainVerifier> => ({
    tokenFor: jest.fn().mockReturnValue('token-secreto'),
    isPublished: jest.fn().mockResolvedValue(published),
  });

  const repository = (
    domains: TenantDomainRecord[] = [],
  ): jest.Mocked<TenantRepository> =>
    ({
      findById: jest.fn().mockResolvedValue(tenant),
      setStatus: jest
        .fn()
        .mockImplementation((id: string, status: 'active' | 'paused' | 'building') =>
          Promise.resolve(new Tenant(id, 'pasteleria', 'Pastelería Luna', null, status)),
        ),
      listDomains: jest.fn().mockResolvedValue(domains),
      addDomain: jest
        .fn()
        .mockImplementation((_id: string, domain: string, verified: boolean) =>
          Promise.resolve(
            new TenantDomainRecord(
              '018f6f1a-0000-7000-8000-000000000001',
              domain,
              false,
              verified ? new Date() : null,
            ),
          ),
        ),
      markDomainVerified: jest
        .fn()
        .mockResolvedValue(
          new TenantDomainRecord(
            '018f6f1a-0000-7000-8000-000000000001',
            'pasteleria.cl',
            false,
            new Date(),
          ),
        ),
    }) as unknown as jest.Mocked<TenantRepository>;

  it('pausa un cliente sin tocar su contenido', async () => {
    const useCase = new ManageTenantUseCase(repository(), verifier(true), platform);

    const paused = await useCase.setStatus(
      '018f6f1a-0000-7000-8000-000000000007',
      'paused',
    );

    expect(paused.status).toBe('paused');
    expect(paused.isServable()).toBe(false);
  });

  it('no deja cambiar el estado de un cliente que no existe', async () => {
    const empty = {
      findById: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<TenantRepository>;
    const useCase = new ManageTenantUseCase(empty, verifier(true), platform);

    await expect(
      useCase.setStatus('018f6f1a-0000-7000-8000-000000000099', 'paused'),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('da por verificado un subdominio de la propia plataforma', async () => {
    const repo = repository();
    const useCase = new ManageTenantUseCase(repo, verifier(false), platform);

    const created = await useCase.addDomain(
      '018f6f1a-0000-7000-8000-000000000007',
      'pasteleria.webbuilder.co',
    );

    expect(repo.addDomain).toHaveBeenCalledWith(
      '018f6f1a-0000-7000-8000-000000000007',
      'pasteleria.webbuilder.co',
      true,
    );
    expect(created.isVerified()).toBe(true);
  });

  it('deja sin verificar un dominio propio del cliente', async () => {
    const repo = repository();
    const useCase = new ManageTenantUseCase(repo, verifier(false), platform);

    const created = await useCase.addDomain(
      '018f6f1a-0000-7000-8000-000000000007',
      'pasteleria.cl',
    );

    expect(repo.addDomain).toHaveBeenCalledWith(
      '018f6f1a-0000-7000-8000-000000000007',
      'pasteleria.cl',
      false,
    );
    expect(created.isVerified()).toBe(false);
  });

  it('no marca verificado un dominio cuyo TXT todavía no está publicado', async () => {
    const pending = new TenantDomainRecord(
      '018f6f1a-0000-7000-8000-000000000001',
      'pasteleria.cl',
      false,
      null,
    );
    const useCase = new ManageTenantUseCase(
      repository([pending]),
      verifier(false),
      platform,
    );

    await expect(
      useCase.verifyDomain(
        '018f6f1a-0000-7000-8000-000000000007',
        '018f6f1a-0000-7000-8000-000000000001',
      ),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it('verifica cuando el TXT coincide con el token del cliente', async () => {
    const pending = new TenantDomainRecord(
      '018f6f1a-0000-7000-8000-000000000001',
      'pasteleria.cl',
      false,
      null,
    );
    const check = verifier(true);
    const repo = repository([pending]);
    const useCase = new ManageTenantUseCase(repo, check, platform);

    const verified = await useCase.verifyDomain(
      '018f6f1a-0000-7000-8000-000000000007',
      '018f6f1a-0000-7000-8000-000000000001',
    );

    expect(check.isPublished).toHaveBeenCalledWith('pasteleria.cl', 'token-secreto');
    expect(verified.isVerified()).toBe(true);
  });

  it('no vuelve a consultar el DNS de un dominio ya verificado', async () => {
    const done = new TenantDomainRecord(
      '018f6f1a-0000-7000-8000-000000000001',
      'pasteleria.cl',
      true,
      new Date(),
    );
    const check = verifier(false);
    const useCase = new ManageTenantUseCase(repository([done]), check, platform);

    await useCase.verifyDomain(
      '018f6f1a-0000-7000-8000-000000000007',
      '018f6f1a-0000-7000-8000-000000000001',
    );

    expect(check.isPublished).not.toHaveBeenCalled();
  });

  it('entrega instrucciones de DNS con CNAME para un subdominio y A para un dominio raíz', () => {
    const useCase = new ManageTenantUseCase(repository(), verifier(true), platform);

    const apex = useCase.instructionsFor(
      '018f6f1a-0000-7000-8000-000000000007',
      new TenantDomainRecord(
        '018f6f1a-0000-7000-8000-000000000001',
        'pasteleria.cl',
        false,
        null,
      ),
    );
    const sub = useCase.instructionsFor(
      '018f6f1a-0000-7000-8000-000000000007',
      new TenantDomainRecord(
        '018f6f1a-0000-7000-8000-000000000002',
        'www.pasteleria.cl',
        false,
        null,
      ),
    );

    expect(apex.records[0]).toEqual({
      type: 'TXT',
      host: '_webbuilder.pasteleria.cl',
      value: 'token-secreto',
      purpose: 'Demuestra que el dominio es tuyo',
    });
    expect(apex.records[1].type).toBe('A');
    expect(sub.records[1].type).toBe('CNAME');
    expect(sub.records[1].value).toBe('sitios.webbuilder.co');
  });
});
