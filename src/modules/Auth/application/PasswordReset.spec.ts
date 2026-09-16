import { AdminUser } from '../domain/AdminUser';
import type { AdminUserRepository } from '../domain/AdminUserRepository';
import { InvalidResetTokenError } from '../domain/InvalidResetTokenError';
import type { PasswordHasher } from '../domain/PasswordHasher';
import type { PasswordResetMailer } from '../domain/PasswordResetMailer';
import type {
  PasswordResetRepository,
  PasswordResetTicket,
} from '../domain/PasswordResetRepository';
import { hashResetToken } from '../domain/resetToken';
import {
  PasswordResetConfig,
  RequestPasswordResetUseCase,
} from './RequestPasswordResetUseCase';
import { ResetPasswordUseCase } from './ResetPasswordUseCase';

describe('recuperación de contraseña', () => {
  const user = new AdminUser(7, 'johann@webbuilder.co', 'Johann', 'hash-viejo');

  const buildUsers = (found: AdminUser | null): jest.Mocked<AdminUserRepository> => ({
    findByEmail: jest.fn().mockResolvedValue(found),
    findById: jest.fn().mockResolvedValue(found),
    findAll: jest.fn().mockResolvedValue(found === null ? [] : [found]),
    create: jest.fn(),
    setRole: jest.fn(),
    setDisabled: jest.fn(),
    setPassword: jest.fn(),
  });

  const buildTickets = (
    found: PasswordResetTicket | null = null,
  ): jest.Mocked<PasswordResetRepository> => ({
    create: jest.fn(),
    findByTokenHash: jest.fn().mockResolvedValue(found),
    markUsed: jest.fn(),
    invalidateAllFor: jest.fn(),
  });

  const buildMailer = (): jest.Mocked<PasswordResetMailer> => ({
    sendResetLink: jest.fn(),
    sendInvitation: jest.fn(),
  });

  const buildHasher = (): jest.Mocked<PasswordHasher> => ({
    hash: jest.fn().mockResolvedValue('hash-nuevo'),
    verify: jest.fn(),
  });

  const config = new PasswordResetConfig('https://admin.webbuilder.co/admin/');

  describe('RequestPasswordResetUseCase', () => {
    it('guarda solo el hash del token y manda el enlace con el token en claro', async () => {
      const tickets = buildTickets();
      const mailer = buildMailer();
      const useCase = new RequestPasswordResetUseCase(
        buildUsers(user),
        tickets,
        mailer,
        config,
      );

      await useCase.execute('Johann@WebBuilder.co');

      const sentUrl = mailer.sendResetLink.mock.calls[0][2];
      const token = new URL(sentUrl).searchParams.get('token') ?? '';
      expect(token).toHaveLength(64);
      expect(sentUrl).toBe(
        `https://admin.webbuilder.co/admin/reset-password?token=${token}`,
      );
      expect(tickets.create).toHaveBeenCalledWith(
        7,
        hashResetToken(token),
        expect.any(Date),
      );
      expect(tickets.invalidateAllFor).toHaveBeenCalledWith(7);
    });

    it('no manda nada ni falla cuando el correo no tiene cuenta', async () => {
      const mailer = buildMailer();
      const useCase = new RequestPasswordResetUseCase(
        buildUsers(null),
        buildTickets(),
        mailer,
        config,
      );

      await expect(useCase.execute('nadie@webbuilder.co')).resolves.toBeUndefined();
      expect(mailer.sendResetLink).not.toHaveBeenCalled();
    });

    it('ignora a una persona desactivada', async () => {
      const disabled = new AdminUser(
        8,
        'ex@webbuilder.co',
        'Ex',
        'hash',
        'editor',
        new Date(),
      );
      const mailer = buildMailer();
      const useCase = new RequestPasswordResetUseCase(
        buildUsers(disabled),
        buildTickets(),
        mailer,
        config,
      );

      await useCase.execute('ex@webbuilder.co');

      expect(mailer.sendResetLink).not.toHaveBeenCalled();
    });
  });

  describe('ResetPasswordUseCase', () => {
    const ticketFor = (
      overrides: Partial<PasswordResetTicket> = {},
    ): PasswordResetTicket => ({
      id: 3,
      adminUserId: 7,
      expiresAt: new Date('2026-09-16T12:00:00.000Z'),
      usedAt: null,
      ...overrides,
    });

    it('cambia la contraseña y quema el enlace', async () => {
      const users = buildUsers(user);
      const tickets = buildTickets(ticketFor());
      const hasher = buildHasher();
      const useCase = new ResetPasswordUseCase(users, tickets, hasher);

      await useCase.execute(
        'token-en-claro',
        'una-clave-larga',
        new Date('2026-09-16T11:00:00.000Z'),
      );

      expect(tickets.findByTokenHash).toHaveBeenCalledWith(
        hashResetToken('token-en-claro'),
      );
      expect(users.setPassword).toHaveBeenCalledWith(7, 'hash-nuevo');
      expect(tickets.markUsed).toHaveBeenCalledWith(3);
    });

    it('rechaza un enlace ya usado', async () => {
      const useCase = new ResetPasswordUseCase(
        buildUsers(user),
        buildTickets(ticketFor({ usedAt: new Date('2026-09-16T10:00:00.000Z') })),
        buildHasher(),
      );

      await expect(
        useCase.execute('token', 'una-clave-larga', new Date('2026-09-16T11:00:00.000Z')),
      ).rejects.toBeInstanceOf(InvalidResetTokenError);
    });

    it('rechaza un enlace vencido', async () => {
      const useCase = new ResetPasswordUseCase(
        buildUsers(user),
        buildTickets(ticketFor()),
        buildHasher(),
      );

      await expect(
        useCase.execute('token', 'una-clave-larga', new Date('2026-09-16T13:00:00.000Z')),
      ).rejects.toBeInstanceOf(InvalidResetTokenError);
    });

    it('rechaza un token que no existe', async () => {
      const useCase = new ResetPasswordUseCase(
        buildUsers(user),
        buildTickets(null),
        buildHasher(),
      );

      await expect(
        useCase.execute('inventado', 'una-clave-larga'),
      ).rejects.toBeInstanceOf(InvalidResetTokenError);
    });
  });
});
