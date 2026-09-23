export interface RetentionRun {
  readonly contactMessagesDeleted: number;
  readonly subscribersDeleted: number;
  readonly ordersAnonymized: number;
}

export interface RetentionCutoffs {
  readonly contactMessages: Date;
  readonly unsubscribedSubscribers: Date;
  readonly orders: Date;
}

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class RetentionRepository {
  /**
   * Borra o anonimiza lo vencido en TODOS los clientes. Es idempotente: una segunda pasada
   * sobre lo mismo no encuentra nada que hacer, así que se puede ejecutar a mano sin riesgo.
   */
  public abstract purge(cutoffs: RetentionCutoffs): Promise<RetentionRun>;
}
