import { FastifyRequest, FastifyReply } from 'fastify';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    reply.status(401).send({ error: 'Token inválido ou expirado.' });
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string; email: string };
    user: { id: string; email: string };
  }
}
