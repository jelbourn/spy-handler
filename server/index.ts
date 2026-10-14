import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { config } from './config.ts';
import { gameService } from './routes/game-service.ts';

const app = new Hono();
app.use(logger());

app.route('/api', gameService);

serve({ fetch: app.fetch, port: config.port }, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
});
