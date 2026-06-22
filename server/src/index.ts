import 'dotenv/config';
import app from './app';
import { closeDatabase, initDatabase } from './db/index';
import { startCronJobs, stopCronJobs } from './services/cronService';
import { startFeishuJobs, stopFeishuJobs } from './services/feishuService';
import { broadcastToClients, closeWsServer, setupWsServer } from './ws/wsServer';

const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000;

initDatabase();

const server = app.listen(port, () => {
  console.log(`TidalFlow server listening on http://localhost:${port}`);
});

setupWsServer(server);
startCronJobs();
startFeishuJobs();

function shutdown(signal: NodeJS.Signals): void {
  console.log(`${signal} received, shutting down TidalFlow server`);

  stopCronJobs();
  stopFeishuJobs();
  broadcastToClients({
    type: 'server:shutdown',
    payload: {
      message: 'Server is shutting down',
    },
  });
  closeWsServer();

  server.close(() => {
    closeDatabase();
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
