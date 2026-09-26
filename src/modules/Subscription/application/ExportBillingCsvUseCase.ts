import { SubscriptionRepository } from '../domain/SubscriptionRepository';

export class ExportBillingCsvUseCase {
  constructor(private readonly subscriptions: SubscriptionRepository) {}

  public async execute(now = new Date()): Promise<string> {
    const all = await this.subscriptions.findAll();

    const headers = ['tenantId', 'planName', 'status', 'formattedPrice', 'priceCents'];
    const rows = [headers.join(',')];

    for (const sub of all) {
      const status = sub.getStatus(now);
      // We are interested in those to charge (por_vencer / al_dia - in the current cycle) 
      // and those who became overdue (atrasado). We'll just export all of them with their status.
      if (status === 'por_vencer' || status === 'atrasado' || status === 'al_dia') {
        rows.push(
          [
            sub.tenantId,
            `"${sub.planName}"`,
            status,
            `"${sub.formattedPrice}"`,
            sub.priceCents.toString(),
          ].join(',')
        );
      }
    }

    return rows.join('\n');
  }
}
