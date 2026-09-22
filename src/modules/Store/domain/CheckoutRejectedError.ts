import { BadRequestError } from '@/shared/domain/BadRequestError';

// El motivo lo lee quien compra, así que se escribe para esa persona, no para un log.
export class CheckoutRejectedError extends BadRequestError {}
