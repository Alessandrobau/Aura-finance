import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';

const createSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório.'),
  valorAlvo: z.number().positive('Valor alvo deve ser positivo.'),
  valorAtual: z.number().min(0).default(0),
  tipo: z.enum(['economizar', 'investir', 'comprar', 'viajar', 'outros']),
  prazo: z.string().optional(),
});

const updateSchema = createSchema.partial();

const addValueSchema = z.object({
  valor: z.number(),
});

export async function goalRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request, reply) => {
    const metas = await prisma.goal.findMany({
      where: { usuarioId: request.user.id },
      orderBy: { criadoEm: 'desc' },
    });

    const result = metas.map(meta => ({
      ...meta,
      percentualConcluido: Number(meta.valorAlvo) > 0
        ? Math.min(100, (Number(meta.valorAtual) / Number(meta.valorAlvo)) * 100)
        : 0,
      valorRestante: Math.max(0, Number(meta.valorAlvo) - Number(meta.valorAtual)),
      concluida: Number(meta.valorAtual) >= Number(meta.valorAlvo),
    }));

    return reply.send(result);
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const meta = await prisma.goal.findFirst({
      where: { id, usuarioId: request.user.id },
    });
    if (!meta) return reply.status(404).send({ error: 'Meta não encontrada.' });

    return reply.send({
      ...meta,
      percentualConcluido: Number(meta.valorAlvo) > 0
        ? Math.min(100, (Number(meta.valorAtual) / Number(meta.valorAlvo)) * 100)
        : 0,
      valorRestante: Math.max(0, Number(meta.valorAlvo) - Number(meta.valorAtual)),
      concluida: Number(meta.valorAtual) >= Number(meta.valorAlvo),
    });
  });

  app.post('/', async (request, reply) => {
    const result = createSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: result.error.issues[0]?.message });
    }

    const { nome, valorAlvo, valorAtual, tipo, prazo } = result.data;
    const meta = await prisma.goal.create({
      data: {
        usuarioId: request.user.id,
        nome,
        valorAlvo,
        valorAtual,
        tipo,
        prazo: prazo ? new Date(prazo) : undefined,
      },
    });

    return reply.status(201).send(meta);
  });

  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = updateSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: result.error.issues[0]?.message });
    }

    const existing = await prisma.goal.findFirst({ where: { id, usuarioId: request.user.id } });
    if (!existing) return reply.status(404).send({ error: 'Meta não encontrada.' });

    const { prazo, ...rest } = result.data;
    const updated = await prisma.goal.update({
      where: { id },
      data: { ...rest, ...(prazo ? { prazo: new Date(prazo) } : {}) },
    });

    return reply.send(updated);
  });

  app.patch('/:id/contribute', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = addValueSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: 'Valor inválido.' });
    }

    const meta = await prisma.goal.findFirst({ where: { id, usuarioId: request.user.id } });
    if (!meta) return reply.status(404).send({ error: 'Meta não encontrada.' });

    const novoValor = Math.max(0, Number(meta.valorAtual) + result.data.valor);
    const updated = await prisma.goal.update({
      where: { id },
      data: { valorAtual: novoValor },
    });

    return reply.send({
      ...updated,
      percentualConcluido: Number(updated.valorAlvo) > 0
        ? Math.min(100, (Number(updated.valorAtual) / Number(updated.valorAlvo)) * 100)
        : 0,
    });
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.goal.findFirst({ where: { id, usuarioId: request.user.id } });
    if (!existing) return reply.status(404).send({ error: 'Meta não encontrada.' });

    await prisma.goal.delete({ where: { id } });
    return reply.status(204).send();
  });
}
