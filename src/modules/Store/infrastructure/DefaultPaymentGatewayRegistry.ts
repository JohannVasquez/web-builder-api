import {
  PaymentGatewayRegistry,
  UnsupportedPaymentProviderError,
  type PaymentGateway,
} from '../domain/PaymentGateway';

export class DefaultPaymentGatewayRegistry implements PaymentGatewayRegistry {
  private readonly byProvider: ReadonlyMap<string, PaymentGateway>;

  constructor(gateways: readonly PaymentGateway[]) {
    this.byProvider = new Map(gateways.map((gateway) => [gateway.provider, gateway]));
  }

  public for(provider: string): PaymentGateway {
    const gateway = this.byProvider.get(provider);
    if (gateway === undefined) {
      throw new UnsupportedPaymentProviderError(provider);
    }
    return gateway;
  }
}
