import { randomBytes } from 'node:crypto';
import type { RecordActivityUseCase } from '@/modules/ActivityLog/application/RecordActivityUseCase';
import type { ManageAdminUsersUseCase } from '@/modules/Auth/application/ManageAdminUsersUseCase';
import type { AdminUserRepository } from '@/modules/Auth/domain/AdminUserRepository';
import type { PasswordHasher } from '@/modules/Auth/domain/PasswordHasher';
import type { SiteCacheInvalidator } from '@/modules/SiteCache/domain/SiteCacheInvalidator';
import type { PlatformDomainConfig } from '@/modules/Tenant/application/ManageTenantUseCase';
import { UnprocessableEntityError } from '@/shared/domain/UnprocessableEntityError';
import { SIBLING_CONVERTED_REASON, type Demo, type DemoCreator } from '../domain/Demo';
import type { ConvertedDemo, DemoRepository, DemoView } from '../domain/DemoRepository';
import type { ConvertDemoInput } from '../domain/DemoSchema';
import { definitiveSlugFor, slugSuggestions } from '../domain/demoSlug';
import {
  ClientSlugTakenError,
  DemoAddressTakenError,
  DemoNotFoundError,
  DemoOwnerDisabledError,
  DemoOwnerNotClientError,
} from '../domain/errors';

// El máximo de la columna `tenants.slug`.
const CLIENT_SLUG_MAX_LENGTH = 100;

// Qué pasó con el correo del dueño. La conversión no depende de él: si falla, el sitio ya es
// del cliente y la persona puede pedir su contraseña con "olvidé mi contraseña".
export type OwnerInvitation =
  | { readonly status: 'sent' }
  | { readonly status: 'failed'; readonly message: string }
  // La cuenta ya existía: entra con su contraseña de siempre y ve el sitio nuevo en su panel.
  | { readonly status: 'not-needed'; readonly message: string };

export interface DemoConversionResult {
  readonly view: DemoView;
  readonly converted: ConvertedDemo;
  readonly invitation: OwnerInvitation | null;
}

export class ConvertDemoUseCase {
  constructor(
    private readonly demoRepository: DemoRepository,
    private readonly adminUserRepository: AdminUserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly manageAdminUsers: ManageAdminUsersUseCase,
    private readonly cacheInvalidator: SiteCacheInvalidator,
    private readonly platform: PlatformDomainConfig,
    private readonly recordActivity: RecordActivityUseCase,
  ) {}

  public async execute(
    demoId: string,
    input: ConvertDemoInput,
    actor: DemoCreator,
    now: Date = new Date(),
  ): Promise<DemoConversionResult> {
    if (this.platform.baseDomain === '') {
      throw new UnprocessableEntityError(
        'Falta PLATFORM_DOMAIN: el cliente necesita su dirección en la plataforma y sin él no la tiene.',
      );
    }
    const demo = await this.demoRepository.findDemo(demoId);
    if (demo === null) {
      throw new DemoNotFoundError();
    }
    demo.assertCanBeConverted();
    const before = await this.requireView(demoId);
    if (before.site === null) {
      throw new DemoNotFoundError();
    }

    const slug = input.slug ?? definitiveSlugFor(before.site.slug);
    if (await this.demoRepository.isAddressTaken(slug, this.addressFor(slug))) {
      throw new ClientSlugTakenError(slug, await this.suggestSlug(slug));
    }
    // Antes de tocar nada: un correo del equipo o de una cuenta desactivada no se resuelve
    // dejando la conversión a medias.
    const owner = input.owner === undefined ? null : await this.prepareOwner(input.owner);

    let converted: ConvertedDemo;
    try {
      converted = await this.demoRepository.convert({
        demoId,
        slug,
        address: this.addressFor(slug),
        now,
        owner,
      });
    } catch (error) {
      // Otro sitio tomó el slug o la dirección entre la consulta y la transacción.
      if (error instanceof DemoAddressTakenError) {
        throw new ClientSlugTakenError(slug, await this.suggestSlug(slug));
      }
      throw error;
    }

    // Recién con la transacción confirmada: una invitación enviada antes podría llegar a una
    // cuenta que la transacción terminó deshaciendo.
    const invitation = await this.invite(converted.owner);
    const view = await this.requireView(demoId);

    // Las dos direcciones: la vieja para que nadie vea una copia de la demo, la nueva para que
    // no se sirva algo que se guardó antes de que fuera de este sitio.
    await this.cacheInvalidator.invalidate([
      ...converted.removedAddresses,
      this.addressFor(slug),
      ...converted.discardedSiblings.flatMap((sibling) =>
        sibling.address === null ? [] : [sibling.address],
      ),
    ]);

    await this.record(demo, before, converted, invitation, actor, slug);
    return { view, converted, invitation };
  }

  private async prepareOwner(
    owner: NonNullable<ConvertDemoInput['owner']>,
  ): Promise<{ email: string; name: string; passwordHash: string }> {
    const email = owner.email.trim().toLowerCase();
    const existing = await this.adminUserRepository.findByEmail(email);
    if (existing?.isStaff() === true) {
      throw new DemoOwnerNotClientError();
    }
    if (existing?.isDisabled() === true) {
      throw new DemoOwnerDisabledError();
    }
    // Una contraseña que nadie conoce, igual que al invitar: la persona elige la suya con el
    // enlace del correo. Si la cuenta ya existe, no se usa.
    const passwordHash = await this.passwordHasher.hash(randomBytes(32).toString('hex'));
    return { email, name: owner.name.trim(), passwordHash };
  }

  private async invite(owner: ConvertedDemo['owner']): Promise<OwnerInvitation | null> {
    if (owner === null) {
      return null;
    }
    if (!owner.created) {
      return {
        status: 'not-needed',
        message:
          'Ya tenía una cuenta de cliente con ese correo: entra con su contraseña de siempre y ahora también ve este sitio.',
      };
    }
    try {
      await this.manageAdminUsers.sendInvitation(owner);
      return { status: 'sent' };
    } catch (error) {
      console.error('[Demo] No se pudo mandar la invitación del dueño:', error);
      return {
        status: 'failed',
        message:
          'La demo quedó convertida y la cuenta creada, pero no se pudo mandar la invitación. La persona puede elegir su contraseña con "olvidé mi contraseña" en el panel (POST /api/admin/auth/forgot-password).',
      };
    }
  }

  private async record(
    demo: Demo,
    before: DemoView,
    converted: ConvertedDemo,
    invitation: OwnerInvitation | null,
    actor: DemoCreator,
    slug: string,
  ): Promise<void> {
    const entry = {
      actorType: actor.type,
      actorId: actor.id,
      actorName: actor.name,
      entityType: 'demo',
    } as const;
    await this.recordActivity.execute({
      ...entry,
      tenantId: demo.tenantId,
      action: 'demo.convert',
      entityId: demo.id,
      summary: `Convirtió la demo ${before.site?.slug ?? demo.id} en el cliente ${slug}`,
      before: {
        status: 'demo',
        slug: before.site?.slug ?? null,
        address: before.site?.address ?? null,
        expiresAt: demo.expiresAt?.toISOString() ?? null,
      },
      // Sin el correo del dueño: el registro de actividad lo lee todo el equipo.
      after: {
        status: 'active',
        slug,
        address: this.addressFor(slug),
        ownerId: converted.owner?.id ?? null,
        ownerCreated: converted.owner?.created ?? null,
        invitation: invitation?.status ?? null,
        discardedDemoIds: converted.discardedSiblings.map((sibling) => sibling.demoId),
      },
    });
    for (const sibling of converted.discardedSiblings) {
      await this.recordActivity.execute({
        ...entry,
        tenantId: sibling.tenantId,
        action: 'demo.discard',
        entityId: sibling.demoId,
        summary: `Descartó la demo ${sibling.address ?? sibling.demoId} al convertir otra propuesta al mismo prospecto`,
        after: { reason: SIBLING_CONVERTED_REASON, convertedDemoId: demo.id },
      });
    }
  }

  private addressFor(slug: string): string {
    return `${slug}.${this.platform.baseDomain}`;
  }

  private async suggestSlug(slug: string): Promise<string | null> {
    for (const candidate of slugSuggestions(slug, CLIENT_SLUG_MAX_LENGTH)) {
      if (
        !(await this.demoRepository.isAddressTaken(candidate, this.addressFor(candidate)))
      ) {
        return candidate;
      }
    }
    return null;
  }

  private async requireView(demoId: string): Promise<DemoView> {
    const view = await this.demoRepository.findById(demoId);
    if (view === null) {
      throw new DemoNotFoundError();
    }
    return view;
  }
}
