import { Router } from 'express';
import type { ApiResponse } from '@tidalflow/shared';

interface HealthStatus {
  status: 'ok';
  uptime: number;
}

const router = Router();

router.get<Record<string, string>, ApiResponse<HealthStatus>>('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      uptime: process.uptime(),
    },
  });
});

export default router;
