import { randomBytes } from 'node:crypto';
import { BadRequestError } from '@/shared/domain/BadRequestError';
import { NotFoundError } from '@/shared/domain/NotFoundError';
import { UnprocessableEntityError } from '@/shared/domain/UnprocessableEntityError';
import type { TenantRepository } from '@/modules/Tenant/domain/TenantRepository';
import type { AdminRole, AdminUser, AdminUserPrimitives } from '../domain/AdminUser';
import type { AdminUserRepository } from '../domain/AdminUserRepository';
import type { PasswordHasher } from '../domain/PasswordHasher';
import type { PasswordResetMailer } from '../domain/PasswordResetMailer';
import type { InviteAdminUserInput } from '../domain/AdminUserSchema';
import type { RequestPasswordResetUseCase } from './RequestPasswordResetUseCase';

export class ManageAdminUsersUseCase {
  constructor(
    private readonly adminUserRepository: AdminUserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly passwordReset: RequestPasswordResetUseCase,
    private readonly mailer: PasswordResetMailer,
    private readonly tenantRepository: TenantRepository,
  ) {}

  public async list(): Promise<AdminUserPrimitives[]> {
    const users = await this.adminUserRepository.findAll();
    return users.map((user) => user.toPrimitives());
  }

  public async invite(input: InviteAdminUserInput): Promise<AdminUserPrimitives> {
    const email = input.email.trim().toLowerCase();
    if ((await this.adminUserRepository.findByEmail(email)) !== null) {
      throw new BadRequestError('Ya existe una cuenta con ese correo.');
    }
    if (input.role === 'client') {
      await this.guardNoDemos(input.tenantIds);
    }

    // Se crea con una contraseña aleatoria que nadie conoce: la persona invitada la
    // define con el enlace del correo, así no viaja ninguna clave provisoria.
    const passwordHash = await this.passwordHasher.hash(randomBytes(32).toString('hex'));
    const user = await this.adminUserRepository.create(
      email,
      input.name.trim(),
      passwordHash,
      input.role,
      input.tenantIds,
    );

    await this.sendInvitation(user);
    return user.toPrimitives();
  }

  // El correo para que una cuenta nueva elija su contraseña. Aparte porque convertir una demo
  // crea la cuenta del dueño dentro de su transacción y el correo sale recién cuando quedó
  // confirmada: si saliera antes, podría llegar la invitación a una cuenta que no existe.
  public async sendInvitation(
    user: Pick<AdminUserPrimitives, 'id' | 'email' | 'name'>,
  ): Promise<void> {
    const token = await this.passwordReset.issue(user.id);
    await this.mailer.sendInvitation(
      user.email,
      user.name,
      this.passwordReset.buildUrl(token),
    );
  }

  public async changeRole(
    actorId: string,
    id: string,
    role: AdminRole,
    tenantIds: readonly string[] = [],
  ): Promise<AdminUserPrimitives> {
    const user = await this.requireUser(id);
    if (user.id === actorId && role !== 'owner') {
      throw new BadRequestError(
        'No puedes quitarte a ti misma el rol de dueña: quedarías sin acceso a esta pantalla.',
      );
    }
    await this.guardLastOwner(user.id, user.role === 'owner' && role !== 'owner');
    if (role === 'client') {
      await this.guardNoDemos(tenantIds);
    }

    const updated = await this.adminUserRepository.setRole(id, role);
    // El alcance se reescribe con el rol: quien deja de ser cliente no puede quedarse con
    // una lista vieja esperando a que alguien la borre.
    const scoped = await this.adminUserRepository.setTenants(
      id,
      role === 'client' ? tenantIds : [],
    );
    return (scoped ?? updated ?? user).toPrimitives();
  }

  public async setDisabled(
    actorId: string,
    id: string,
    disabled: boolean,
  ): Promise<AdminUserPrimitives> {
    const user = await this.requireUser(id);
    if (user.id === actorId && disabled) {
      throw new BadRequestError('No puedes desactivar tu propia cuenta.');
    }
    await this.guardLastOwner(user.id, user.role === 'owner' && disabled);

    const updated = await this.adminUserRepository.setDisabled(id, disabled);
    return (updated ?? user).toPrimitives();
  }

  private async requireUser(id: string): Promise<AdminUser> {
    const user = await this.adminUserRepository.findById(id);
    if (user === null) {
      throw new NotFoundError('Esa persona no existe en el panel.');
    }
    return user;
  }

  // El prospecto de una demo solo mira su sitio con el enlace mágico: no entra al panel. Una
  // cuenta de cliente sobre una demo le abriría el contenido y la edición antes de comprar.
  private async guardNoDemos(tenantIds: readonly string[]): Promise<void> {
    const tenants = await Promise.all(
      tenantIds.map((tenantId) => this.tenantRepository.findById(tenantId)),
    );
    if (tenants.some((tenant) => tenant?.isDemo() === true)) {
      throw new UnprocessableEntityError(
        'A una demo no se le asignan personas con rol cliente: el prospecto la ve con su enlace, sin entrar al panel. Conviértela en cliente primero.',
      );
    }
  }

  // Sin dueños activos nadie puede volver a invitar ni a reactivar a nadie: la cuenta
  // quedaría cerrada por dentro.
  private async guardLastOwner(id: string, wouldRemoveOwner: boolean): Promise<void> {
    if (!wouldRemoveOwner) {
      return;
    }
    const users = await this.adminUserRepository.findAll();
    const remaining = users.filter(
      (user) => user.role === 'owner' && !user.isDisabled() && user.id !== id,
    );
    if (remaining.length === 0) {
      throw new BadRequestError(
        'Debe quedar al menos una persona dueña activa. Nombra a otra antes de hacer este cambio.',
      );
    }
  }
}
