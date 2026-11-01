// ai.controller.ts
import { Request, Response, NextFunction } from 'express';
import { AiService } from './ai.service';

export class AiController {
  static async ask(req: Request, res: Response, next: NextFunction) {
    try {
      const response = await AiService.askAssistant(req.businessId!, req.body.question);
      res.status(200).json({ data: response });
    } catch (err) {
      next(err);
    }
  }
}