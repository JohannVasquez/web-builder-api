import { normalizeDomain } from '../domain/domainName';
import { TenantRepository } from '../domain/TenantRepository';

/**
 * Responde si un dominio puede recibir tráfico. Es el `ask` endpoint que
 * consulta Caddy antes de emitir un certificado con on-demand TLS: cualquiera
 * puede apuntar su dominio a nuestra IP, y sin esta comprobación le pediríamos
 * un certificado a Let's Encrypt por cada uno hasta agotar el rate limit.
 *
 * A diferencia de `ResolveTenantUseCase` aquí NO hay fallback al tenant por
 * defecto: la pregunta es "¿este dominio concreto es nuestro?", así que un
 * dominio desconocido o todavía sin verificar debe responder que no.
 */
export class IsDomainAllowedUseCase {
  constructor(private readonly tenantRepository: TenantRepository) {}

  public async execute(rawDomain: string | undefined): Promise<boolean> {
    const domain = normalizeDomain(rawDomain);
    if (domain === undefined) {
      return false;
    }
    return (await this.tenantRepository.findByDomain(domain)) !== null;
  }
}
