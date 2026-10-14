import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { config } from './config.ts';
import { startScheduler } from './game/scheduler.ts';
import { gameService } from './routes/game-service.ts';
import { webhooks } from './routes/webhooks.ts';

const app = new Hono();
app.use(logger());

app.route('/api', gameService);
app.route('/', webhooks);

serve({ fetch: app.fetch, port: config.port }, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
  if (config.fakeServices) {
    console.log('Using fake ElevenLabs and Twilio (--fake-services): no real calls.');
  }
});
if (config.scheduler) {
  startScheduler();
}
