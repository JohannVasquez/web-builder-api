import type { Request, Response } from 'express';
import type { ReviewSiteQualityUseCase } from '../application/ReviewSiteQualityUseCase';

export class AdminSiteQualityReviewController {
  constructor(private readonly reviewSiteQualityUseCase: ReviewSiteQualityUseCase) {}

  public review = async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.params.tenantId;
    if (typeof tenantId !== 'string') {
      res.status(400).json({ error: 'Falta el tenantId' });
      return;
    }
    const observations = await this.reviewSiteQualityUseCase.execute(tenantId);
    res.json({ observations });
  };
}
