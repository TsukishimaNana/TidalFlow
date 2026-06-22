import 'dotenv/config';
import app from './app';
import { initDatabase } from './db/index';

const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000;

initDatabase();

app.listen(port, () => {
  console.log(`TidalFlow server listening on http://localhost:${port}`);
});
