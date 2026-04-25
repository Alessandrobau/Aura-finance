import { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { chat as geminiChat } from '../../services/gemini.js';
import { chat as ollamaChat, isOllamaAvailable } from '../../services/ollama.js';
import { env } from '../../config/env.js';
import type { FunctionCallResult } from '../../services/gemini.js';

const chatSchema = z.object({
  mensagem: z.string().min(1, 'Mensagem é obrigatória.'),
  historico: z
    .array(z.object({ role: z.enum(['user', 'model']), content: z.string() }))
    .default([]),
  provider: z.enum(['gemini', 'ollama', 'auto']).default('auto'),
});

async function handleFunctionCall(
  userId: string,
  functionCall: FunctionCallResult,
  responseText: string,
  provider: string,
  reply: FastifyReply
) {
  if (functionCall.transacao) {
    const t = functionCall.transacao;
    const transacaoCriada = await prisma.transaction.create({
      data: {
        usuarioId: userId,
        tipo: t.tipo as 'receita' | 'despesa',
        valor: t.valor,
        categoria: t.categoria,
        descricao: t.descricao,
        data: t.data ? new Date(t.data) : new Date(),
        criadoPorIa: true,
        promptOriginal: responseText,
      },
    });
    return reply.send({ resposta: responseText, provider, transacaoCriada });
  }

  if (functionCall.solicitacao) {
    const s = functionCall.solicitacao;
    return reply.send({
      resposta: responseText || s.pergunta,
      provider,
      transacaoCriada: null,
      solicitacao: s,
    });
  }

  if (functionCall.simulacao) {
    const { valorTotal, parcelas, taxaJuros } = functionCall.simulacao;
    const taxa = taxaJuros / 100;
    let valorParcela: number;
    let total: number;

    if (!taxa) {
      valorParcela = valorTotal / parcelas;
      total = valorTotal;
    } else {
      const fator = Math.pow(1 + taxa, parcelas);
      valorParcela = (valorTotal * taxa * fator) / (fator - 1);
      total = valorParcela * parcelas;
    }

    return reply.send({
      resposta: responseText || `Simulação: ${parcelas}x de R$ ${valorParcela.toFixed(2)}`,
      provider,
      transacaoCriada: null,
      simulacao: { valorTotal, parcelas, valorParcela, taxaJuros, total },
    });
  }

  if (functionCall.meta) {
    const m = functionCall.meta;
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
    return reply.send({ resposta: responseText, provider, metaCriada });
  }

  if (functionCall.contribuicaoMeta) {
    const { nomeMeta, valor } = functionCall.contribuicaoMeta;
    const meta = await prisma.goal.findFirst({
      where: { usuarioId: userId, nome: { contains: nomeMeta, mode: 'insensitive' } },
    });

    if (!meta) {
      return reply.send({
        resposta: `Não encontrei nenhuma meta com o nome "${nomeMeta}". Verifique o nome e tente novamente.`,
        provider,
      });
    }

    const metaAtualizada = await prisma.goal.update({
      where: { id: meta.id },
      data: { valorAtual: { increment: valor } },
    });

    return reply.send({
      resposta: responseText,
      provider,
      contribuicaoMeta: {
        metaNome: metaAtualizada.nome,
        valorContribuido: valor,
        valorAtual: Number(metaAtualizada.valorAtual),
        valorAlvo: Number(metaAtualizada.valorAlvo),
        percentual: Math.min(100, (Number(metaAtualizada.valorAtual) / Number(metaAtualizada.valorAlvo)) * 100),
      },
    });
  }

  if (functionCall.investimento) {
    const inv = functionCall.investimento;
    const ticker = inv.ticker.toUpperCase();

    const existing = await prisma.investment.findUnique({
      where: { usuarioId_ticker: { usuarioId: userId, ticker } },
    });

    let investimentoAdicionado;
    if (existing) {
      const qtdTotal = Number(existing.quantidade) + inv.quantidade;
      const novoPreco =
        (Number(existing.quantidade) * Number(existing.precoMedio) + inv.quantidade * inv.precoMedio) / qtdTotal;
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

    return reply.send({ resposta: responseText, provider, investimentoAdicionado });
  }

  if (functionCall.divida) {
    const d = functionCall.divida;
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
    return reply.send({ resposta: responseText, provider, dividaCriada });
  }
}

export async function aiChatRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.post('/', async (request, reply) => {
    const result = chatSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: result.error.issues[0]?.message });
    }

    const { mensagem, historico, provider } = result.data;
    const userId = request.user.id;

    const useOllama =
      provider === 'ollama' ||
      (provider === 'auto' && !env.GEMINI_API_KEY && (await isOllamaAvailable()));

    if (!useOllama && !env.GEMINI_API_KEY) {
      return reply.status(503).send({
        error: 'Nenhum provedor de IA disponível. Configure GEMINI_API_KEY ou inicie o Ollama.',
      });
    }

    const usedProvider = useOllama ? 'ollama' : 'gemini';
    const aiResponse = useOllama
      ? await ollamaChat(historico, mensagem)
      : await geminiChat(historico, mensagem);

    if (aiResponse.functionCall) {
      const handled = await handleFunctionCall(
        userId,
        aiResponse.functionCall,
        aiResponse.text,
        usedProvider,
        reply
      );
      if (handled !== undefined) return handled;
    }

    return reply.send({ resposta: aiResponse.text, provider: usedProvider, transacaoCriada: null });
  });
}
