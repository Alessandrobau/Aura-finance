import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { env } from './config/env.js';
import { authenticate } from './middleware/auth.js';
import { authRoutes } from './routes/auth.js';
import { transactionRoutes } from './routes/transactions.js';
import { investmentRoutes } from './routes/investments.js';
import { goalRoutes } from './routes/goals.js';
import { debtRoutes } from './routes/debts.js';
import { aiChatRoutes } from './routes/ai/chat.js';
import { aiInsightsRoutes } from './routes/ai/insights.js';

const app = Fastify({
  logger: env.NODE_ENV === 'development'
    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
    : true,
});

app.decorate('authenticate', authenticate);

await app.register(cors, {
  origin: env.NODE_ENV === 'development' ? true : ['https://your-frontend.com'],
  credentials: true,
});

await app.register(jwt, {
  secret: env.JWT_SECRET,
  sign: { expiresIn: env.JWT_EXPIRES_IN },
});

await app.register(authRoutes, { prefix: '/api/auth' });
await app.register(transactionRoutes, { prefix: '/api/transactions' });
await app.register(investmentRoutes, { prefix: '/api/investments' });
await app.register(goalRoutes, { prefix: '/api/goals' });
await app.register(debtRoutes, { prefix: '/api/debts' });
await app.register(aiChatRoutes, { prefix: '/api/ai/chat' });
await app.register(aiInsightsRoutes, { prefix: '/api/ai/insights' });

app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

try {
  await app.listen({ port: env.PORT, host: env.HOST });
  console.log(`Server running on http://${env.HOST}:${env.PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: typeof authenticate;
  }
}
