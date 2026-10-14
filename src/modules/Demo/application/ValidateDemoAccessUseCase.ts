import type { DemoLinkKind } from '../domain/Demo';
import type { DemoRepository } from '../domain/DemoRepository';
import { hashDemoToken, looksLikeDemoToken } from '../domain/demoToken';

export interface GrantedDemoAccess {
  readonly demoId: string;
  readonly kind: DemoLinkKind;
}

export class ValidateDemoAccessUseCase {
  constructor(private readonly demoRepository: DemoRepository) {}

  // Devuelve nulo en todos los casos de rechazo, sin decir cuál: para quien pregunta, un token
  // anulado, vencido o de otra demo tiene que ser indistinguible de uno que nunca existió.
  public async execute(
    tenantId: string,
    token: string,
    now: Date = new Date(),
  ): Promise<GrantedDemoAccess | null> {
    if (!looksLikeDemoToken(token)) {
      return null;
    }
    const access = await this.demoRepository.findAccess(hashDemoToken(token));
    if (
      access === null ||
      access.revokedAt !== null ||
      access.demo.tenantId !== tenantId ||
      !access.demo.admits(access.kind, now)
    ) {
      return null;
    }
    return { demoId: access.demo.id, kind: access.kind };
  }
}
