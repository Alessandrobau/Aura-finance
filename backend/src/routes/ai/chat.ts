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

    let responseText = '';
    let transacaoCriada = null;
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
      responseText = ollamaResponse.text;

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
    } else {
      usedProvider = 'gemini';
      const geminiResponse = await geminiChat(historico, mensagem);
      responseText = geminiResponse.text;

      if (geminiResponse.functionCall?.transacao) {
        const t = geminiResponse.functionCall.transacao;
        transacaoCriada = await prisma.transaction.create({
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
      }
    }

    return reply.send({
      resposta: responseText,
      provider: usedProvider,
      transacaoCriada,
    });
  });
}
