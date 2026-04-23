import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';

const createSchema = z.object({
  credor: z.string().min(1, 'Credor é obrigatório.'),
  valorTotal: z.number().positive('Valor total deve ser positivo.'),
  valorPago: z.number().min(0).default(0),
  taxaJuros: z.number().min(0).optional(),
  vencimento: z.string().datetime({ offset: true }).optional(),
});

const updateSchema = createSchema.partial();

const paymentSchema = z.object({
  valor: z.number().positive('Valor do pagamento deve ser positivo.'),
});

export async function debtRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request, reply) => {
    const dividas = await prisma.debt.findMany({
      where: { usuarioId: request.user.id },
      orderBy: { criadoEm: 'desc' },
    });

    const result = dividas.map(d => ({
      ...d,
      valorPendente: Math.max(0, Number(d.valorTotal) - Number(d.valorPago)),
      percentualPago: Number(d.valorTotal) > 0
        ? Math.min(100, (Number(d.valorPago) / Number(d.valorTotal)) * 100)
        : 0,
      quitada: Number(d.valorPago) >= Number(d.valorTotal),
    }));

    const totalDivida = result.reduce((sum, d) => sum + d.valorPendente, 0);

    return reply.send({ dividas: result, totalDivida });
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const divida = await prisma.debt.findFirst({
      where: { id, usuarioId: request.user.id },
    });
    if (!divida) return reply.status(404).send({ error: 'Dívida não encontrada.' });

    return reply.send({
      ...divida,
      valorPendente: Math.max(0, Number(divida.valorTotal) - Number(divida.valorPago)),
      percentualPago: Number(divida.valorTotal) > 0
        ? Math.min(100, (Number(divida.valorPago) / Number(divida.valorTotal)) * 100)
        : 0,
      quitada: Number(divida.valorPago) >= Number(divida.valorTotal),
    });
  });

  app.post('/', async (request, reply) => {
    const result = createSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: result.error.issues[0]?.message });
    }

    const { credor, valorTotal, valorPago, taxaJuros, vencimento } = result.data;
    const divida = await prisma.debt.create({
      data: {
        usuarioId: request.user.id,
        credor,
        valorTotal,
        valorPago,
        taxaJuros,
        vencimento: vencimento ? new Date(vencimento) : undefined,
      },
    });

    return reply.status(201).send(divida);
  });

  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = updateSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: result.error.issues[0]?.message });
    }

    const existing = await prisma.debt.findFirst({ where: { id, usuarioId: request.user.id } });
    if (!existing) return reply.status(404).send({ error: 'Dívida não encontrada.' });

    const { vencimento, ...rest } = result.data;
    const updated = await prisma.debt.update({
      where: { id },
      data: { ...rest, ...(vencimento ? { vencimento: new Date(vencimento) } : {}) },
    });

    return reply.send(updated);
  });

  app.patch('/:id/pay', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = paymentSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: result.error.issues[0]?.message });
    }

    const divida = await prisma.debt.findFirst({ where: { id, usuarioId: request.user.id } });
    if (!divida) return reply.status(404).send({ error: 'Dívida não encontrada.' });

    const novoValorPago = Math.min(Number(divida.valorTotal), Number(divida.valorPago) + result.data.valor);
    const updated = await prisma.debt.update({
      where: { id },
      data: { valorPago: novoValorPago },
    });

    return reply.send({
      ...updated,
      valorPendente: Math.max(0, Number(updated.valorTotal) - Number(updated.valorPago)),
      percentualPago: (Number(updated.valorPago) / Number(updated.valorTotal)) * 100,
      quitada: Number(updated.valorPago) >= Number(updated.valorTotal),
    });
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.debt.findFirst({ where: { id, usuarioId: request.user.id } });
    if (!existing) return reply.status(404).send({ error: 'Dívida não encontrada.' });

    await prisma.debt.delete({ where: { id } });
    return reply.status(204).send();
  });
}
