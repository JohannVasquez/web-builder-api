import { randomBytes } from 'node:crypto';
import { BadRequestError } from '../../../shared/domain/BadRequestError';
import { NotFoundError } from '../../../shared/domain/NotFoundError';
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

    // Se crea con una contraseña aleatoria que nadie conoce: la persona invitada la
    // define con el enlace del correo, así no viaja ninguna clave provisoria.
    const passwordHash = await this.passwordHasher.hash(randomBytes(32).toString('hex'));
    const user = await this.adminUserRepository.create(
      email,
      input.name.trim(),
      passwordHash,
      input.role,
    );

    const token = await this.passwordReset.issue(user.id);
    await this.mailer.sendInvitation(
      user.email,
      user.name,
      this.passwordReset.buildUrl(token),
    );
    return user.toPrimitives();
  }

  public async changeRole(
    actorId: number,
    id: number,
    role: AdminRole,
  ): Promise<AdminUserPrimitives> {
    const user = await this.requireUser(id);
    if (user.id === actorId && role !== 'owner') {
      throw new BadRequestError(
        'No puedes quitarte a ti misma el rol de dueña: quedarías sin acceso a esta pantalla.',
      );
    }
    await this.guardLastOwner(user.id, user.role === 'owner' && role !== 'owner');

    const updated = await this.adminUserRepository.setRole(id, role);
    return (updated ?? user).toPrimitives();
  }

  public async setDisabled(
    actorId: number,
    id: number,
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

  private async requireUser(id: number): Promise<AdminUser> {
    const user = await this.adminUserRepository.findById(id);
    if (user === null) {
      throw new NotFoundError('Esa persona no existe en el panel.');
    }
    return user;
  }

  // Sin dueños activos nadie puede volver a invitar ni a reactivar a nadie: la cuenta
  // quedaría cerrada por dentro.
  private async guardLastOwner(id: number, wouldRemoveOwner: boolean): Promise<void> {
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
