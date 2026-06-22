import type { NextFunction, Request, Response } from 'express';
import type { ApiResponse } from '@tidalflow/shared';

const UNAUTHORIZED_RESPONSE: ApiResponse<never> = {
  success: false,
  error: 'Unauthorized: Invalid API Key',
};

export default function auth(
  req: Request,
  res: Response<ApiResponse<never>>,
  next: NextFunction
): void {
  const configuredApiKey = process.env.API_KEY;
  const requestApiKey = req.header('X-API-Key');

  if (!configuredApiKey || requestApiKey !== configuredApiKey) {
    res.status(401).json(UNAUTHORIZED_RESPONSE);
    return;
  }

  next();
}
