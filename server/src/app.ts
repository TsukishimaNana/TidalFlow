import cors from 'cors';
import express from 'express';
import auth from './middleware/auth';
import errorHandler from './middleware/errorHandler';
import healthRoutes from './routes/health';
import settingsRoutes from './routes/settings';
import taskRoutes from './routes/tasks';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1/health', healthRoutes);
app.use('/api/v1', auth);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/settings', settingsRoutes);

app.use(errorHandler);

export default app;
