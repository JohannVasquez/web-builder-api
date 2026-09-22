import { DnsDomainVerifier } from './DnsDomainVerifier';

describe('DnsDomainVerifier', () => {
  it('da un token distinto por cliente y estable en el tiempo', () => {
    const verifier = new DnsDomainVerifier('secreto-de-la-plataforma');

    expect(verifier.tokenFor('018f6f1a-0000-7000-8000-000000000001')).toBe(
      verifier.tokenFor('018f6f1a-0000-7000-8000-000000000001'),
    );
    expect(verifier.tokenFor('018f6f1a-0000-7000-8000-000000000001')).not.toBe(
      verifier.tokenFor('018f6f1a-0000-7000-8000-000000000002'),
    );
    expect(verifier.tokenFor('018f6f1a-0000-7000-8000-000000000001')).toHaveLength(32);
  });

  it('no repite el token si cambia el secreto', () => {
    expect(
      new DnsDomainVerifier('uno').tokenFor('018f6f1a-0000-7000-8000-000000000001'),
    ).not.toBe(
      new DnsDomainVerifier('dos').tokenFor('018f6f1a-0000-7000-8000-000000000001'),
    );
  });

  it('consulta el TXT bajo _webbuilder y acepta el registro partido en trozos', async () => {
    const resolveTxt = jest.fn().mockResolvedValue([['tok', 'en']]);
    const verifier = new DnsDomainVerifier('secreto', resolveTxt);

    await expect(verifier.isPublished('pasteleria.cl', 'token')).resolves.toBe(true);
    expect(resolveTxt).toHaveBeenCalledWith('_webbuilder.pasteleria.cl');
  });

  it('rechaza cuando el TXT existe pero dice otra cosa', async () => {
    const verifier = new DnsDomainVerifier(
      'secreto',
      jest.fn().mockResolvedValue([['otro']]),
    );

    await expect(verifier.isPublished('pasteleria.cl', 'token')).resolves.toBe(false);
  });

  it('trata el fallo del DNS como "todavía no", no como error', async () => {
    const verifier = new DnsDomainVerifier(
      'secreto',
      jest.fn().mockRejectedValue(new Error('ENOTFOUND')),
    );

    await expect(verifier.isPublished('pasteleria.cl', 'token')).resolves.toBe(false);
  });
});
