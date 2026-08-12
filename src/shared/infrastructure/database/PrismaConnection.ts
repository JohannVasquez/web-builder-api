import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/generated/client';

export class PrismaConnection {
  private readonly client: PrismaClient;

  constructor(connectionString: string) {
    this.client = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
  }

  public getClient(): PrismaClient {
    return this.client;
  }

  public async close(): Promise<void> {
    await this.client.$disconnect();
  }
}
