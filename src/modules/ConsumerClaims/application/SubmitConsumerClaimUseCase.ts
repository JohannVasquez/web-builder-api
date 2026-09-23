import type { OrderRepository } from '@/modules/Store/domain/OrderRepository';
import {
  isWithinWithdrawalWindow,
  type ConsumerClaim,
  type ConsumerClaimInput,
} from '../domain/ConsumerClaim';
import type { ConsumerClaimRepository } from '../domain/ConsumerClaimRepository';
import { WithdrawalOutOfWindowError } from '../domain/WithdrawalOutOfWindowError';
import { BadRequestError } from '@/shared/domain/BadRequestError';

export class SubmitConsumerClaimUseCase {
  constructor(
    private readonly claims: ConsumerClaimRepository,
    private readonly orders: OrderRepository,
  ) {}

  public async execute(
    tenantId: string,
    input: ConsumerClaimInput,
    now = new Date(),
  ): Promise<ConsumerClaim> {
    if (input.kind === 'retracto') {
      await this.ensureWithinWindow(tenantId, input, now);
    }
    return this.claims.create(tenantId, input);
  }

  private async ensureWithinWindow(
    tenantId: string,
    input: ConsumerClaimInput,
    now: Date,
  ): Promise<void> {
    if (input.orderNumber === null) {
      throw new BadRequestError('Para retractarte necesitamos tu número de pedido.');
    }

    const order = await this.orders.findByNumber(tenantId, input.orderNumber);
    // Mismo mensaje para un pedido que no existe y para uno de otro correo: si dijéramos cuál
    // es, el formulario serviría para adivinar números de pedido ajenos.
    if (order === null || order.customer.email !== input.email.trim().toLowerCase()) {
      throw new BadRequestError('No encontramos un pedido con ese número y ese correo.');
    }

    if (!isWithinWithdrawalWindow(order.createdAt, now)) {
      throw new WithdrawalOutOfWindowError();
    }
  }
}
