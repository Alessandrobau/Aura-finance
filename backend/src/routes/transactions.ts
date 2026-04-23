import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';

const createSchema = z.object({
  tipo: z.enum(['receita', 'despesa']),
  valor: z.number().positive('Valor deve ser positivo.'),
  categoria: z.string().min(1, 'Categoria é obrigatória.'),
  descricao: z.string().optional(),
  data: z.string().datetime({ offset: true }).optional(),
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
  mes: z.string().optional(),
  ano: z.string().optional(),
  tipo: z.enum(['receita', 'despesa']).optional(),
  categoria: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export async function transactionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request, reply) => {
    const q = querySchema.parse(request.query);
    const userId = request.user.id;
    const page = parseInt(q.page ?? '1', 10);
    const limit = Math.min(parseInt(q.limit ?? '20', 10), 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { usuarioId: userId };
    if (q.tipo) where['tipo'] = q.tipo;
    if (q.categoria) where['categoria'] = { contains: q.categoria, mode: 'insensitive' };

    if (q.mes || q.ano) {
      const year = parseInt(q.ano ?? new Date().getFullYear().toString(), 10);
      const month = q.mes ? parseInt(q.mes, 10) - 1 : undefined;
      const start = month !== undefined ? new Date(year, month, 1) : new Date(year, 0, 1);
      const end = month !== undefined ? new Date(year, month + 1, 0, 23, 59, 59) : new Date(year, 11, 31, 23, 59, 59);
      where['data'] = { gte: start, lte: end };
    }

    const [transacoes, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { data: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return reply.send({
      data: transacoes,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  });

  app.get('/summary', async (request, reply) => {
    const q = querySchema.parse(request.query);
    const userId = request.user.id;
    const year = parseInt(q.ano ?? new Date().getFullYear().toString(), 10);
    const month = q.mes ? parseInt(q.mes, 10) - 1 : new Date().getMonth();

    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59);

    const transacoes = await prisma.transaction.findMany({
      where: { usuarioId: userId, data: { gte: start, lte: end } },
    });

    const receitas = transacoes
      .filter(t => t.tipo === 'receita')
      .reduce((sum, t) => sum + Number(t.valor), 0);

    const despesas = transacoes
      .filter(t => t.tipo === 'despesa')
      .reduce((sum, t) => sum + Number(t.valor), 0);

    const porCategoria = transacoes.reduce<Record<string, { total: number; tipo: string }>>((acc, t) => {
      if (!acc[t.categoria]) acc[t.categoria] = { total: 0, tipo: t.tipo };
      acc[t.categoria]!.total += Number(t.valor);
      return acc;
    }, {});

    return reply.send({
      receitas,
      despesas,
      saldo: receitas - despesas,
      porCategoria,
      periodo: { mes: month + 1, ano: year },
    });
  });

  app.get('/annual', async (request, reply) => {
    const q = querySchema.parse(request.query);
    const userId = request.user.id;
    const year = parseInt(q.ano ?? new Date().getFullYear().toString(), 10);

    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59);

    const transacoes = await prisma.transaction.findMany({
      where: { usuarioId: userId, data: { gte: start, lte: end } },
    });

    const byMonth = Array.from({ length: 12 }, (_, i) => ({
      mes: i + 1,
      receitas: 0,
      despesas: 0,
      saldo: 0,
    }));

    for (const t of transacoes) {
      const m = new Date(t.data).getMonth();
      const entry = byMonth[m]!;
      if (t.tipo === 'receita') entry.receitas += Number(t.valor);
      else entry.despesas += Number(t.valor);
      entry.saldo = entry.receitas - entry.despesas;
    }

    return reply.send({ ano: year, meses: byMonth });
  });

  app.post('/', async (request, reply) => {
    const result = createSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: result.error.issues[0]?.message });
    }

    const { tipo, valor, categoria, descricao, data } = result.data;
    const transacao = await prisma.transaction.create({
      data: {
        usuarioId: request.user.id,
        tipo,
        valor,
        categoria,
        descricao,
        data: data ? new Date(data) : new Date(),
      },
    });

    return reply.status(201).send(transacao);
  });

  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = updateSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: result.error.issues[0]?.message });
    }

    const existing = await prisma.transaction.findFirst({
      where: { id, usuarioId: request.user.id },
    });
    if (!existing) return reply.status(404).send({ error: 'Transação não encontrada.' });

    const { data: dateStr, ...rest } = result.data;
    const transacao = await prisma.transaction.update({
      where: { id },
      data: { ...rest, ...(dateStr ? { data: new Date(dateStr) } : {}) },
    });

    return reply.send(transacao);
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.transaction.findFirst({
      where: { id, usuarioId: request.user.id },
    });
    if (!existing) return reply.status(404).send({ error: 'Transação não encontrada.' });

    await prisma.transaction.delete({ where: { id } });
    return reply.status(204).send();
  });
}
