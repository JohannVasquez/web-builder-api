import type { PrismaClient } from '../../src/shared/infrastructure/prisma/generated/client';
import { ScryptPasswordHasher } from '../../src/modules/Auth/infrastructure/ScryptPasswordHasher';
import type { Seeder } from './Seeder';

export interface AdminUserSeedParams {
  readonly email: string;
  readonly password: string;
  readonly name: string;
}

/**
 * Crea el primer usuario admin si `admin_users` está vacía; si ya existe
 * alguien con ese email, deja su contraseña intacta (re-sembrar no debe
 * pisar una clave que el admin ya cambió desde el panel).
 */
export class AdminUserSeeder implements Seeder<AdminUserSeedParams> {
  constructor(private readonly prisma: PrismaClient) {}

  public async execute(params: AdminUserSeedParams): Promise<void> {
    const existing = await this.prisma.adminUser.findUnique({
      where: { email: params.email },
    });
    if (existing !== null) {
      return;
    }

    const passwordHash = await new ScryptPasswordHasher().hash(params.password);
    await this.prisma.adminUser.create({
      data: { email: params.email, passwordHash, name: params.name },
    });
  }
}
