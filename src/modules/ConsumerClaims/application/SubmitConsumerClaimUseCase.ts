import type { OrderRepository } from '@/modules/Store/domain/OrderRepository';
import {
  isWithinWithdrawalWindow,
  type ConsumerClaim,
  type ConsumerClaimInput,
} from '../domain/ConsumerClaim';
import type { ConsumerClaimRepository } from '../domain/ConsumerClaimRepository';
import { WithdrawalOutOfWindowError } from '../domain/WithdrawalOutOfWindowError';
import { BadRequestError } from '@/shared/domain/BadRequestError';

import type { GlobalSettingsRepository } from '@/modules/GlobalSettings/domain/GlobalSettingsRepository';
import type { ConsumerClaimMailer } from '../domain/ConsumerClaimMailer';

export class SubmitConsumerClaimUseCase {
  constructor(
    private readonly claims: ConsumerClaimRepository,
    private readonly orders: OrderRepository,
    private readonly settings: GlobalSettingsRepository,
    private readonly mailer: ConsumerClaimMailer,
  ) {}

  public async execute(
    tenantId: string,
    input: ConsumerClaimInput,
    now = new Date(),
  ): Promise<ConsumerClaim> {
    if (input.kind === 'retracto') {
      await this.ensureWithinWindow(tenantId, input, now);
    }
    const claim = await this.claims.create(tenantId, input);

    try {
      const settings = await this.settings.find(tenantId);
      const sellerEmail = settings.get('contactEmail');
      const storeName = settings.get('siteName') || 'nuestra tienda';

      if (sellerEmail) {
        await this.mailer.notifySeller(claim, sellerEmail);
      }
      await this.mailer.sendAcknowledgmentToBuyer(claim, storeName);
    } catch (error) {
      // Un fallo de correo no pierde el reclamo
      console.error('Error al enviar correos de reclamo:', error);
    }

    return claim;
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
