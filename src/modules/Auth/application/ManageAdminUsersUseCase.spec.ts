import { BadRequestError } from '@/shared/domain/BadRequestError';
import { NotFoundError } from '@/shared/domain/NotFoundError';
import { AdminUser, type AdminRole } from '../domain/AdminUser';
import type { AdminUserRepository } from '../domain/AdminUserRepository';
import type { PasswordHasher } from '../domain/PasswordHasher';
import type { PasswordResetMailer } from '../domain/PasswordResetMailer';
import { ManageAdminUsersUseCase } from './ManageAdminUsersUseCase';
import type { RequestPasswordResetUseCase } from './RequestPasswordResetUseCase';

describe('ManageAdminUsersUseCase', () => {
  const owner = new AdminUser(
    '018f6f1a-0000-7000-8000-000000000001',
    'johann@webbuilder.co',
    'Johann',
    'hash',
    'owner',
  );
  const editor = new AdminUser(
    '018f6f1a-0000-7000-8000-000000000002',
    'pau@webbuilder.co',
    'Pau',
    'hash',
    'editor',
  );

  const buildRepository = (users: AdminUser[]): jest.Mocked<AdminUserRepository> => ({
    findByEmail: jest
      .fn()
      .mockImplementation((email: string) =>
        Promise.resolve(users.find((user) => user.email === email) ?? null),
      ),
    findById: jest
      .fn()
      .mockImplementation((id: string) =>
        Promise.resolve(users.find((user) => user.id === id) ?? null),
      ),
    findAll: jest.fn().mockResolvedValue(users),
    create: jest
      .fn()
      .mockImplementation((email: string, name: string, hash: string, role: AdminRole) =>
        Promise.resolve(
          new AdminUser('018f6f1a-0000-7000-8000-000000000009', email, name, hash, role),
        ),
      ),
    setRole: jest.fn().mockResolvedValue(null),
    setDisabled: jest.fn().mockResolvedValue(null),
    setPassword: jest.fn(),
    setTenants: jest.fn().mockResolvedValue(null),
  });

  const buildPasswordReset = (): jest.Mocked<
    Pick<RequestPasswordResetUseCase, 'issue' | 'buildUrl'>
  > => ({
    issue: jest.fn().mockResolvedValue('token-de-invitacion'),
    buildUrl: jest
      .fn()
      .mockReturnValue('https://panel/reset-password?token=token-de-invitacion'),
  });

  const buildMailer = (): jest.Mocked<PasswordResetMailer> => ({
    sendResetLink: jest.fn(),
    sendInvitation: jest.fn(),
  });

  const buildHasher = (): jest.Mocked<PasswordHasher> => ({
    hash: jest.fn().mockResolvedValue('hash-aleatorio'),
    verify: jest.fn(),
  });

  const build = (
    users: AdminUser[],
  ): {
    useCase: ManageAdminUsersUseCase;
    repository: jest.Mocked<AdminUserRepository>;
    mailer: jest.Mocked<PasswordResetMailer>;
  } => {
    const repository = buildRepository(users);
    const mailer = buildMailer();
    const useCase = new ManageAdminUsersUseCase(
      repository,
      buildHasher(),
      buildPasswordReset() as unknown as RequestPasswordResetUseCase,
      mailer,
    );
    return { useCase, repository, mailer };
  };

  it('nunca expone el hash de la contraseña al listar', async () => {
    const { useCase } = build([owner, editor]);

    const users = await useCase.list();

    expect(users).toEqual([
      {
        id: '018f6f1a-0000-7000-8000-000000000001',
        email: 'johann@webbuilder.co',
        name: 'Johann',
        role: 'owner',
        disabled: false,
        tenantScope: null,
      },
      {
        id: '018f6f1a-0000-7000-8000-000000000002',
        email: 'pau@webbuilder.co',
        name: 'Pau',
        role: 'editor',
        disabled: false,
        tenantScope: null,
      },
    ]);
    expect(JSON.stringify(users)).not.toContain('hash');
  });

  it('invita con una contraseña aleatoria y manda el enlace para definirla', async () => {
    const { useCase, repository, mailer } = build([owner]);

    const created = await useCase.invite({
      email: '  Nueva@WebBuilder.co ',
      name: '  Nueva  ',
      role: 'editor',
      tenantIds: [],
    });

    expect(repository.create).toHaveBeenCalledWith(
      'nueva@webbuilder.co',
      'Nueva',
      'hash-aleatorio',
      'editor',
      [],
    );
    expect(mailer.sendInvitation).toHaveBeenCalledWith(
      'nueva@webbuilder.co',
      'Nueva',
      'https://panel/reset-password?token=token-de-invitacion',
    );
    expect(created.role).toBe('editor');
  });

  it('rechaza invitar un correo que ya tiene cuenta', async () => {
    const { useCase } = build([owner]);

    await expect(
      useCase.invite({
        email: 'johann@webbuilder.co',
        name: 'Otro',
        role: 'editor',
        tenantIds: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it('deja ascender a un editor', async () => {
    const { useCase, repository } = build([owner, editor]);

    await useCase.changeRole(
      '018f6f1a-0000-7000-8000-000000000001',
      '018f6f1a-0000-7000-8000-000000000002',
      'owner',
    );

    expect(repository.setRole).toHaveBeenCalledWith(
      '018f6f1a-0000-7000-8000-000000000002',
      'owner',
    );
  });

  it('impide que alguien se quite a sí mismo el rol de dueña', async () => {
    const { useCase } = build([owner, editor]);

    await expect(
      useCase.changeRole(
        '018f6f1a-0000-7000-8000-000000000001',
        '018f6f1a-0000-7000-8000-000000000001',
        'editor',
      ),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it('impide dejar el panel sin ninguna dueña activa', async () => {
    // La otra dueña está desactivada, así que no cuenta como reemplazo.
    const suspended = new AdminUser(
      '018f6f1a-0000-7000-8000-000000000003',
      'otra@webbuilder.co',
      'Otra',
      'hash',
      'owner',
      new Date(),
    );
    const { useCase } = build([owner, suspended, editor]);

    await expect(
      useCase.changeRole(
        '018f6f1a-0000-7000-8000-000000000003',
        '018f6f1a-0000-7000-8000-000000000001',
        'editor',
      ),
    ).rejects.toBeInstanceOf(BadRequestError);
    await expect(
      useCase.setDisabled(
        '018f6f1a-0000-7000-8000-000000000003',
        '018f6f1a-0000-7000-8000-000000000001',
        true,
      ),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it('deja degradar a una dueña si queda otra activa', async () => {
    const second = new AdminUser(
      '018f6f1a-0000-7000-8000-000000000003',
      'otra@webbuilder.co',
      'Otra',
      'hash',
      'owner',
    );
    const third = new AdminUser(
      '018f6f1a-0000-7000-8000-000000000004',
      'tercera@webbuilder.co',
      'Tercera',
      'hash',
      'owner',
    );
    const { useCase, repository } = build([owner, second, third]);

    await useCase.changeRole(
      '018f6f1a-0000-7000-8000-000000000001',
      '018f6f1a-0000-7000-8000-000000000003',
      'editor',
    );

    expect(repository.setRole).toHaveBeenCalledWith(
      '018f6f1a-0000-7000-8000-000000000003',
      'editor',
    );
  });

  it('desactiva a un editor y deja sus tokens sin valor', async () => {
    const { useCase, repository } = build([owner, editor]);

    await useCase.setDisabled(
      '018f6f1a-0000-7000-8000-000000000001',
      '018f6f1a-0000-7000-8000-000000000002',
      true,
    );

    expect(repository.setDisabled).toHaveBeenCalledWith(
      '018f6f1a-0000-7000-8000-000000000002',
      true,
    );
  });

  it('impide desactivarse a uno mismo', async () => {
    const { useCase } = build([owner, editor]);

    await expect(
      useCase.setDisabled(
        '018f6f1a-0000-7000-8000-000000000001',
        '018f6f1a-0000-7000-8000-000000000001',
        true,
      ),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it('responde 404 cuando la persona no existe', async () => {
    const { useCase } = build([owner]);

    await expect(
      useCase.changeRole(
        '018f6f1a-0000-7000-8000-000000000001',
        '018f6f1a-0000-7000-8000-000000000099',
        'editor',
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('invita a una persona de un cliente con su alcance', async () => {
    const { useCase, repository } = build([owner]);

    await useCase.invite({
      email: 'ana@pasteleria.cl',
      name: 'Ana',
      role: 'client',
      tenantIds: ['018f6f1a-0000-7000-8000-000000000040'],
    });

    expect(repository.create).toHaveBeenCalledWith(
      'ana@pasteleria.cl',
      'Ana',
      'hash-aleatorio',
      'client',
      ['018f6f1a-0000-7000-8000-000000000040'],
    );
  });

  it('reescribe el alcance al cambiar el rol', async () => {
    const { useCase, repository } = build([owner, editor]);

    await useCase.changeRole(
      '018f6f1a-0000-7000-8000-000000000001',
      '018f6f1a-0000-7000-8000-000000000002',
      'client',
      ['018f6f1a-0000-7000-8000-000000000040', '018f6f1a-0000-7000-8000-000000000044'],
    );

    expect(repository.setTenants).toHaveBeenCalledWith(
      '018f6f1a-0000-7000-8000-000000000002',
      ['018f6f1a-0000-7000-8000-000000000040', '018f6f1a-0000-7000-8000-000000000044'],
    );
  });

  it('borra el alcance cuando alguien deja de ser cliente', async () => {
    const client = new AdminUser(
      '018f6f1a-0000-7000-8000-000000000003',
      'ana@pasteleria.cl',
      'Ana',
      'hash',
      'client',
    );
    const { useCase, repository } = build([owner, client]);

    await useCase.changeRole(
      '018f6f1a-0000-7000-8000-000000000001',
      '018f6f1a-0000-7000-8000-000000000003',
      'editor',
    );

    expect(repository.setTenants).toHaveBeenCalledWith(
      '018f6f1a-0000-7000-8000-000000000003',
      [],
    );
  });
});
