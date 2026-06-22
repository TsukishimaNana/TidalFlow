import type { NextFunction, Request, Response } from 'express';
import type { ApiResponse } from '@tidalflow/shared';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getStatusCode(err: unknown): number {
  if (isRecord(err) && typeof err.statusCode === 'number') {
    return err.statusCode;
  }

  return 500;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }

  if (isRecord(err) && typeof err.message === 'string') {
    return err.message;
  }

  return 'Internal Server Error';
}

export default function errorHandler(
  err: unknown,
  _req: Request,
  res: Response<ApiResponse<never>>,
  _next: NextFunction
): void {
  console.error(err);

  res.status(getStatusCode(err)).json({
    success: false,
    error: getErrorMessage(err),
  });
}
