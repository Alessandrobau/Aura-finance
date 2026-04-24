import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { chat as geminiChat } from '../../services/gemini.js';
import { ollamaChat, isOllamaAvailable } from '../../services/ollama.js';
import { env } from '../../config/env.js';

const chatSchema = z.object({
  mensagem: z.string().min(1, 'Mensagem é obrigatória.'),
  historico: z
    .array(z.object({ role: z.enum(['user', 'model']), content: z.string() }))
    .default([]),
  provider: z.enum(['gemini', 'ollama', 'auto']).default('auto'),
});

export async function aiChatRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.post('/', async (request, reply) => {
    const result = chatSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: result.error.issues[0]?.message });
    }

    const { mensagem, historico, provider } = result.data;
    const userId = request.user.id;

    let usedProvider = provider;

    const useOllama =
      provider === 'ollama' ||
      (provider === 'auto' && !env.GEMINI_API_KEY && (await isOllamaAvailable()));

    if (!useOllama && !env.GEMINI_API_KEY) {
      return reply.status(503).send({
        error: 'Nenhum provedor de IA disponível. Configure GEMINI_API_KEY ou inicie o Ollama.',
      });
    }

    if (useOllama) {
      usedProvider = 'ollama';
      const ollamaResponse = await ollamaChat(historico, mensagem);
      let transacaoCriada = null;

      if (ollamaResponse.transacao) {
        const t = ollamaResponse.transacao;
        transacaoCriada = await prisma.transaction.create({
          data: {
            usuarioId: userId,
            tipo: t.tipo as 'receita' | 'despesa',
            valor: t.valor,
            categoria: t.categoria,
            descricao: t.descricao,
            criadoPorIa: true,
            promptOriginal: mensagem,
          },
        });
      }

      return reply.send({ resposta: ollamaResponse.text, provider: usedProvider, transacaoCriada });
    }

    // Gemini path
    usedProvider = 'gemini';
    const geminiResponse = await geminiChat(historico, mensagem);
    const responseText = geminiResponse.text;

    if (geminiResponse.functionCall?.transacao) {
      const t = geminiResponse.functionCall.transacao;
      const transacaoCriada = await prisma.transaction.create({
        data: {
          usuarioId: userId,
          tipo: t.tipo as 'receita' | 'despesa',
          valor: t.valor,
          categoria: t.categoria,
          descricao: t.descricao,
          data: t.data ? new Date(t.data) : new Date(),
          criadoPorIa: true,
          promptOriginal: mensagem,
        },
      });
      return reply.send({ resposta: responseText, provider: usedProvider, transacaoCriada });
    }

    if (geminiResponse.functionCall?.solicitacao) {
      const s = geminiResponse.functionCall.solicitacao;
      return reply.send({
        resposta: responseText || s.pergunta,
        provider: usedProvider,
        transacaoCriada: null,
        solicitacao: s,
      });
    }

    if (geminiResponse.functionCall?.simulacao) {
      const { valorTotal, parcelas, taxaJuros } = geminiResponse.functionCall.simulacao;
      const taxa = taxaJuros / 100;
      let valorParcela: number;
      let total: number;

      if (!taxa) {
        valorParcela = valorTotal / parcelas;
        total = valorTotal;
      } else {
        // Price (PMT) formula: PMT = PV * [i(1+i)^n] / [(1+i)^n - 1]
        const fator = Math.pow(1 + taxa, parcelas);
        valorParcela = (valorTotal * taxa * fator) / (fator - 1);
        total = valorParcela * parcelas;
      }

      return reply.send({
        resposta: responseText || `Simulação: ${parcelas}x de R$ ${valorParcela.toFixed(2)}`,
        provider: usedProvider,
        transacaoCriada: null,
        simulacao: { valorTotal, parcelas, valorParcela, taxaJuros, total },
      });
    }

    if (geminiResponse.functionCall?.meta) {
      const m = geminiResponse.functionCall.meta;
      const metaCriada = await prisma.goal.create({
        data: {
          usuarioId: userId,
          nome: m.nome,
          valorAlvo: m.valorAlvo,
          valorAtual: 0,
          tipo: m.tipo as 'economizar' | 'investir' | 'comprar' | 'viajar' | 'outros',
          prazo: m.prazo ? new Date(m.prazo) : null,
        },
      });
      return reply.send({ resposta: responseText, provider: usedProvider, metaCriada });
    }

    if (geminiResponse.functionCall?.contribuicaoMeta) {
      const { nomeMeta, valor } = geminiResponse.functionCall.contribuicaoMeta;
      const meta = await prisma.goal.findFirst({
        where: { usuarioId: userId, nome: { contains: nomeMeta, mode: 'insensitive' } },
      });

      if (!meta) {
        return reply.send({
          resposta: `Não encontrei nenhuma meta com o nome "${nomeMeta}". Verifique o nome e tente novamente.`,
          provider: usedProvider,
        });
      }

      const metaAtualizada = await prisma.goal.update({
        where: { id: meta.id },
        data: { valorAtual: { increment: valor } },
      });

      return reply.send({
        resposta: responseText,
        provider: usedProvider,
        contribuicaoMeta: {
          metaNome: metaAtualizada.nome,
          valorContribuido: valor,
          valorAtual: Number(metaAtualizada.valorAtual),
          valorAlvo: Number(metaAtualizada.valorAlvo),
          percentual: Math.min(100, (Number(metaAtualizada.valorAtual) / Number(metaAtualizada.valorAlvo)) * 100),
        },
      });
    }

    if (geminiResponse.functionCall?.investimento) {
      const inv = geminiResponse.functionCall.investimento;
      const ticker = inv.ticker.toUpperCase();

      const existing = await prisma.investment.findUnique({
        where: { usuarioId_ticker: { usuarioId: userId, ticker } },
      });

      let investimentoAdicionado;
      if (existing) {
        const qtdTotal = Number(existing.quantidade) + inv.quantidade;
        const novoPreco = (Number(existing.quantidade) * Number(existing.precoMedio) + inv.quantidade * inv.precoMedio) / qtdTotal;
        investimentoAdicionado = await prisma.investment.update({
          where: { id: existing.id },
          data: { quantidade: qtdTotal, precoMedio: novoPreco },
        });
      } else {
        investimentoAdicionado = await prisma.investment.create({
          data: {
            usuarioId: userId,
            tipo: inv.tipo as 'cripto' | 'acao' | 'renda_fixa' | 'fii',
            ticker,
            quantidade: inv.quantidade,
            precoMedio: inv.precoMedio,
          },
        });
      }

      return reply.send({ resposta: responseText, provider: usedProvider, investimentoAdicionado });
    }

    if (geminiResponse.functionCall?.divida) {
      const d = geminiResponse.functionCall.divida;
      const dividaCriada = await prisma.debt.create({
        data: {
          usuarioId: userId,
          credor: d.credor,
          valorTotal: d.valorTotal,
          valorPago: 0,
          taxaJuros: d.taxaJuros ?? null,
          vencimento: d.vencimento ? new Date(d.vencimento) : null,
        },
      });
      return reply.send({ resposta: responseText, provider: usedProvider, dividaCriada });
    }

    return reply.send({ resposta: responseText, provider: usedProvider, transacaoCriada: null });
  });
}
