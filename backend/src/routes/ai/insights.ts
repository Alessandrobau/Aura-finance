import { FastifyInstance } from 'fastify';
import { prisma } from '../../db/prisma.js';
import { generateInsight } from '../../services/gemini.js';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export async function aiInsightsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/weekly-summary', async (request, reply) => {
    const userId = request.user.id;
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const transacoes = await prisma.transaction.findMany({
      where: { usuarioId: userId, data: { gte: weekAgo } },
      orderBy: { data: 'desc' },
    });

    if (!transacoes.length) {
      return reply.send({ insight: 'Nenhuma transação encontrada na última semana.' });
    }

    const receitas = transacoes.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0);
    const despesas = transacoes.filter(t => t.tipo === 'despesa').reduce((s, t) => s + Number(t.valor), 0);

    const porCategoria = transacoes.reduce<Record<string, number>>((acc, t) => {
      if (t.tipo === 'despesa') acc[t.categoria] = (acc[t.categoria] ?? 0) + Number(t.valor);
      return acc;
    }, {});

    const topCategorias = Object.entries(porCategoria)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([cat, val]) => `${cat}: ${formatCurrency(val)}`)
      .join(', ');

    const prompt = `Analise o resumo financeiro semanal do usuário e forneça insights relevantes:
- Receitas: ${formatCurrency(receitas)}
- Despesas: ${formatCurrency(despesas)}
- Saldo do período: ${formatCurrency(receitas - despesas)}
- Principais categorias de despesa: ${topCategorias || 'nenhuma'}
- Total de transações: ${transacoes.length}

Forneça um resumo conciso (3-4 parágrafos) com:
1. Avaliação geral da semana
2. Pontos de atenção
3. Dicas práticas de melhoria`;

    const insight = await generateInsight(prompt);
    return reply.send({ insight, dados: { receitas, despesas, saldo: receitas - despesas, porCategoria } });
  });

  app.get('/goal-advice/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.id;

    const meta = await prisma.goal.findFirst({ where: { id, usuarioId: userId } });
    if (!meta) return reply.status(404).send({ error: 'Meta não encontrada.' });

    const transacoesMes = await prisma.transaction.findMany({
      where: {
        usuarioId: userId,
        data: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    });

    const receitaMensal = transacoesMes.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0);
    const despesaMensal = transacoesMes.filter(t => t.tipo === 'despesa').reduce((s, t) => s + Number(t.valor), 0);
    const saldoMensal = receitaMensal - despesaMensal;

    const percentual = Number(meta.valorAlvo) > 0
      ? (Number(meta.valorAtual) / Number(meta.valorAlvo)) * 100
      : 0;

    const prazoTexto = meta.prazo
      ? `Prazo: ${new Date(meta.prazo).toLocaleDateString('pt-BR')}`
      : 'Sem prazo definido';

    const prompt = `O usuário tem uma meta financeira e precisa de consultoria:
- Nome da meta: ${meta.nome}
- Tipo: ${meta.tipo === 'economizar' ? 'Economizar dinheiro' : 'Controlar gasto máximo'}
- Valor alvo: ${formatCurrency(Number(meta.valorAlvo))}
- Valor atual: ${formatCurrency(Number(meta.valorAtual))}
- Progresso: ${percentual.toFixed(1)}%
- ${prazoTexto}
- Receita mensal atual: ${formatCurrency(receitaMensal)}
- Despesa mensal atual: ${formatCurrency(despesaMensal)}
- Saldo livre mensal: ${formatCurrency(saldoMensal)}

Forneça uma análise detalhada com:
1. Avaliação do progresso atual
2. Se é viável atingir a meta no prazo
3. Quanto o usuário precisaria reservar mensalmente
4. Estratégias práticas para acelerar o progresso`;

    const insight = await generateInsight(prompt);
    return reply.send({ insight, meta, contextoFinanceiro: { receitaMensal, despesaMensal, saldoMensal } });
  });

  app.get('/anomalies', async (request, reply) => {
    const userId = request.user.id;
    const now = new Date();
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const [mesAtual, mesAnterior] = await Promise.all([
      prisma.transaction.findMany({
        where: { usuarioId: userId, data: { gte: monthAgo } },
      }),
      prisma.transaction.findMany({
        where: { usuarioId: userId, data: { gte: twoMonthsAgo, lt: monthAgo } },
      }),
    ]);

    const categoriaAtual = mesAtual.reduce<Record<string, number>>((acc, t) => {
      if (t.tipo === 'despesa') acc[t.categoria] = (acc[t.categoria] ?? 0) + Number(t.valor);
      return acc;
    }, {});

    const categoriaAnterior = mesAnterior.reduce<Record<string, number>>((acc, t) => {
      if (t.tipo === 'despesa') acc[t.categoria] = (acc[t.categoria] ?? 0) + Number(t.valor);
      return acc;
    }, {});

    const variacoes = Object.entries(categoriaAtual).map(([cat, atual]) => {
      const anterior = categoriaAnterior[cat] ?? 0;
      const variacao = anterior > 0 ? ((atual - anterior) / anterior) * 100 : 100;
      return { categoria: cat, atual, anterior, variacao };
    });

    const anomalias = variacoes.filter(v => v.variacao > 30);

    if (!anomalias.length) {
      return reply.send({ insight: 'Nenhuma anomalia significativa detectada no período.', anomalias: [] });
    }

    const listaAnomalias = anomalias
      .map(a => `${a.categoria}: ${formatCurrency(a.anterior)} → ${formatCurrency(a.atual)} (+${a.variacao.toFixed(0)}%)`)
      .join('\n');

    const prompt = `Analisando as finanças do usuário, identifiquei as seguintes anomalias de gastos (aumentos acima de 30% em relação ao mês anterior):

${listaAnomalias}

Por favor:
1. Explique o impacto dessas variações
2. Identifique quais são mais preocupantes
3. Sugira ações corretivas específicas para cada categoria`;

    const insight = await generateInsight(prompt);
    return reply.send({ insight, anomalias, variacoes });
  });

  app.post('/categorize', async (request, reply) => {
    const { descricao } = request.body as { descricao?: string };
    if (!descricao) return reply.status(400).send({ error: 'Descrição é obrigatória.' });

    const prompt = `Dado a seguinte descrição de uma transação financeira: "${descricao}"

Categorize-a em UMA das seguintes categorias:
alimentação, transporte, moradia, saúde, educação, lazer, vestuário, tecnologia, serviços, salário, investimento, freelance, outros

Responda APENAS com o nome da categoria em minúsculas, sem pontuação ou explicação adicional.`;

    const resposta = await generateInsight(prompt);
    const categoria = resposta.trim().toLowerCase().split('\n')[0] ?? 'outros';

    return reply.send({ categoria, descricao });
  });
}
