import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';

const registerSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres.'),
  email: z.string().email('Email inválido.'),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres.'),
});

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    const result = registerSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: result.error.issues[0]?.message });
    }

    const { nome, email, senha } = result.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ error: 'Email já cadastrado.' });
    }

    const senhaHash = await bcrypt.hash(senha, 12);
    const user = await prisma.user.create({
      data: { nome, email, senhaHash },
      select: { id: true, nome: true, email: true, criadoEm: true },
    });

    const token = app.jwt.sign({ id: user.id, email: user.email });
    return reply.status(201).send({ user, token });
  });

  app.post('/login', async (request, reply) => {
    const result = loginSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: 'Dados inválidos.' });
    }

    const { email, senha } = result.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.status(401).send({ error: 'Credenciais inválidas.' });
    }

    const valid = await bcrypt.compare(senha, user.senhaHash);
    if (!valid) {
      return reply.status(401).send({ error: 'Credenciais inválidas.' });
    }

    const token = app.jwt.sign({ id: user.id, email: user.email });
    return reply.send({
      user: { id: user.id, nome: user.nome, email: user.email },
      token,
    });
  });

  app.get('/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: { id: true, nome: true, email: true, criadoEm: true },
    });
    if (!user) return reply.status(404).send({ error: 'Usuário não encontrado.' });
    return reply.send(user);
  });
}
