/**
 * Contrato común de todos los seeders (uno por módulo). El método
 * principal es `execute`, que recibe los parámetros que ese seeder
 * necesite (`TParams`) y puede devolver un resultado (`TResult`) para
 * encadenarse con otros seeders desde el orquestador (`prisma/seed.ts`).
 */
export interface Seeder<TParams = void, TResult = void> {
  execute(params: TParams): Promise<TResult>;
}
