import { parseId } from '@/shared/domain/identifier';
import type { Request, Response } from 'express';
import type { ListTenantsUseCase } from '../application/ListTenantsUseCase';
import type { CreateTenantUseCase } from '../application/CreateTenantUseCase';
import type { ListSiteTemplatesUseCase } from '../application/ListSiteTemplatesUseCase';
import { CreateTenantSchema } from '../domain/TenantSchema';
import type { ManageTenantUseCase } from '../application/ManageTenantUseCase';
import { DomainSchema } from '../domain/TenantDomain';
import { TENANT_STATUSES } from '../domain/Tenant';
import { getRequestActor } from '@/modules/ApiKey/presentation/actorMiddleware';
import { actorReachesTenant } from '@/modules/ApiKey/domain/Actor';
import { z } from 'zod';

const StatusSchema = z.strictObject({ status: z.enum(TENANT_STATUSES) });
const ListQuerySchema = z.object({
  includeDemos: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export class AdminTenantController {
  constructor(
    private readonly listTenantsUseCase: ListTenantsUseCase,
    private readonly createTenantUseCase: CreateTenantUseCase,
    private readonly listSiteTemplatesUseCase: ListSiteTemplatesUseCase,
    private readonly manageTenantUseCase: ManageTenantUseCase,
  ) {}

  // Cada actor ve solo los clientes que alcanza: una persona de un cliente no puede
  // enterarse de que existen los demás, ni siquiera por el selector del panel.
  public readonly list = async (req: Request, res: Response): Promise<void> => {
    const { includeDemos } = ListQuerySchema.parse(req.query);
    const tenants = await this.listTenantsUseCase.execute({ includeDemos });
    const actor = getRequestActor(res);
    const visible = tenants.filter((tenant) => actorReachesTenant(actor, tenant.id));
    res.status(200).json({ tenants: visible.map((tenant) => tenant.toPrimitives()) });
  };

  public readonly create = async (req: Request, res: Response): Promise<void> => {
    const input = CreateTenantSchema.parse(req.body);
    const tenant = await this.createTenantUseCase.execute(input);
    res.status(201).json({ tenant: tenant.toPrimitives() });
  };

  public readonly listTemplates = async (_req: Request, res: Response): Promise<void> => {
    res.json({ templates: await this.listSiteTemplatesUseCase.execute() });
  };

  public readonly changeStatus = async (req: Request, res: Response): Promise<void> => {
    const { status } = StatusSchema.parse(req.body);
    const tenant = await this.manageTenantUseCase.setStatus(this.tenantIdOf(req), status);
    res.json({ tenant: tenant.toPrimitives() });
  };

  public readonly listDomains = async (req: Request, res: Response): Promise<void> => {
    const tenantId = this.tenantIdOf(req);
    const domains = await this.manageTenantUseCase.listDomains(tenantId);
    res.json({
      domains: domains.map((domain) => ({
        ...domain.toPrimitives(),
        instructions: this.manageTenantUseCase.instructionsFor(tenantId, domain).records,
      })),
    });
  };

  public readonly addDomain = async (req: Request, res: Response): Promise<void> => {
    const tenantId = this.tenantIdOf(req);
    const { domain } = DomainSchema.parse(req.body);
    const created = await this.manageTenantUseCase.addDomain(tenantId, domain);
    res.status(201).json({
      domain: created.toPrimitives(),
      instructions: this.manageTenantUseCase.instructionsFor(tenantId, created).records,
    });
  };

  public readonly verifyDomain = async (req: Request, res: Response): Promise<void> => {
    const tenantId = this.tenantIdOf(req);
    const domain = await this.manageTenantUseCase.verifyDomain(
      tenantId,
      this.idOf(req, 'domainId'),
    );
    res.json({ domain: domain.toPrimitives() });
  };

  public readonly setPrimaryDomain = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const domain = await this.manageTenantUseCase.setPrimaryDomain(
      this.tenantIdOf(req),
      this.idOf(req, 'domainId'),
    );
    res.json({ domain: domain.toPrimitives() });
  };

  public readonly removeDomain = async (req: Request, res: Response): Promise<void> => {
    await this.manageTenantUseCase.deleteDomain(
      this.tenantIdOf(req),
      this.idOf(req, 'domainId'),
    );
    res.status(204).send();
  };

  private tenantIdOf(req: Request): string {
    return this.idOf(req, 'tenantId');
  }

  private idOf(req: Request, param: string): string {
    return parseId(req.params[param], param);
  }
}
