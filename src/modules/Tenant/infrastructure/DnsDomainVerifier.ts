import { createHmac } from 'node:crypto';
import { Resolver } from 'node:dns/promises';
import type { DomainVerifier } from '../domain/DomainVerifier';
import { verificationHostFor } from '../domain/TenantDomain';

export type ResolveTxt = (hostname: string) => Promise<string[][]>;

export class DnsDomainVerifier implements DomainVerifier {
  constructor(
    private readonly secret: string,
    private readonly resolveTxt: ResolveTxt = (hostname) =>
      new Resolver().resolveTxt(hostname),
  ) {}

  public tokenFor(tenantId: number): string {
    return createHmac('sha256', this.secret)
      .update(`domain-verification:${String(tenantId)}`)
      .digest('hex')
      .slice(0, 32);
  }

  // Que el DNS falle es lo normal mientras el registro todavía no se propaga: no es un
  // error del sistema, es un "todavía no".
  public async isPublished(domain: string, token: string): Promise<boolean> {
    try {
      const records = await this.resolveTxt(verificationHostFor(domain));
      return records.some((chunks) => chunks.join('').trim() === token);
    } catch {
      return false;
    }
  }
}
