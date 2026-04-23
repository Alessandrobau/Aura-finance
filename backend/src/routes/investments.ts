import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { getMultipleStockQuotes } from '../services/brapi.js';
import { getMultipleCryptoQuotes } from '../services/coingecko.js';

const createSchema = z.object({
  tipo: z.enum(['cripto', 'acao', 'renda_fixa', 'fii']),
  ticker: z.string().min(1).toUpperCase(),
  quantidade: z.number().positive(),
  precoMedio: z.number().positive(),
});

const updateSchema = z.object({
  quantidade: z.number().positive().optional(),
  precoMedio: z.number().positive().optional(),
});

export async function investmentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request, reply) => {
    const userId = request.user.id;
    const investimentos = await prisma.investment.findMany({
      where: { usuarioId: userId },
      orderBy: { criadoEm: 'asc' },
    });

    if (!investimentos.length) return reply.send({ investimentos: [], patrimonioTotal: 0, cotacoes: {} });

    const acoes = investimentos.filter(i => i.tipo === 'acao' || i.tipo === 'fii').map(i => i.ticker);
    const criptos = investimentos.filter(i => i.tipo === 'cripto').map(i => i.ticker);

    const [stockQuotes, cryptoQuotes] = await Promise.all([
      getMultipleStockQuotes(acoes),
      getMultipleCryptoQuotes(criptos),
    ]);

    const cotacoes: Record<string, { preco: number; variacao: number; variacaoPercent: number; nome: string }> = {};
    for (const q of stockQuotes) {
      cotacoes[q.ticker] = { preco: q.preco, variacao: q.variacao, variacaoPercent: q.variacaoPercent, nome: q.nome };
    }
    for (const q of cryptoQuotes) {
      cotacoes[q.ticker] = { preco: q.preco, variacao: 0, variacaoPercent: q.variacao24h, nome: q.nome };
    }

    let patrimonioTotal = 0;
    const result = investimentos.map(inv => {
      const cotacao = cotacoes[inv.ticker];
      const precoAtual = cotacao?.preco ?? Number(inv.precoMedio);
      const valorAtual = precoAtual * Number(inv.quantidade);
      const valorInvestido = Number(inv.precoMedio) * Number(inv.quantidade);
      const lucroPrejuizo = valorAtual - valorInvestido;
      const lucroPrejuizoPercent = valorInvestido > 0 ? (lucroPrejuizo / valorInvestido) * 100 : 0;

      patrimonioTotal += valorAtual;

      return {
        ...inv,
        precoAtual,
        valorAtual,
        valorInvestido,
        lucroPrejuizo,
        lucroPrejuizoPercent,
        cotacao: cotacao ?? null,
      };
    });

    return reply.send({ investimentos: result, patrimonioTotal, cotacoes });
  });

  app.post('/', async (request, reply) => {
    const result = createSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: result.error.issues[0]?.message });
    }

    const { tipo, ticker, quantidade, precoMedio } = result.data;
    const userId = request.user.id;

    const existing = await prisma.investment.findUnique({
      where: { usuarioId_ticker: { usuarioId: userId, ticker } },
    });

    if (existing) {
      const novaQtd = Number(existing.quantidade) + quantidade;
      const novoPrecoMedio =
        (Number(existing.quantidade) * Number(existing.precoMedio) + quantidade * precoMedio) / novaQtd;

      const updated = await prisma.investment.update({
        where: { id: existing.id },
        data: { quantidade: novaQtd, precoMedio: novoPrecoMedio },
      });
      return reply.send(updated);
    }

    const investimento = await prisma.investment.create({
      data: { usuarioId: userId, tipo, ticker, quantidade, precoMedio },
    });

    return reply.status(201).send(investimento);
  });

  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = updateSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: result.error.issues[0]?.message });
    }

    const existing = await prisma.investment.findFirst({
      where: { id, usuarioId: request.user.id },
    });
    if (!existing) return reply.status(404).send({ error: 'Investimento não encontrado.' });

    const updated = await prisma.investment.update({ where: { id }, data: result.data });
    return reply.send(updated);
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.investment.findFirst({
      where: { id, usuarioId: request.user.id },
    });
    if (!existing) return reply.status(404).send({ error: 'Investimento não encontrado.' });

    await prisma.investment.delete({ where: { id } });
    return reply.status(204).send();
  });

  app.get('/quote/:ticker', async (request, reply) => {
    const { ticker } = request.params as { ticker: string };
    const upper = ticker.toUpperCase();

    const [stockQuotes, cryptoQuotes] = await Promise.all([
      getMultipleStockQuotes([upper]),
      getMultipleCryptoQuotes([upper]),
    ]);

    const quote = stockQuotes[0] ?? null;
    const cryptoQuote = cryptoQuotes[0] ?? null;

    if (!quote && !cryptoQuote) {
      return reply.status(404).send({ error: 'Ticker não encontrado.' });
    }

    return reply.send(quote ?? cryptoQuote);
  });
}
