import axios from 'axios';
import { env } from '../config/env.js';
import type { GeminiChatResponse, FunctionCallResult, ChatMessage } from './gemini.js';

const SYSTEM_PROMPT = `Você é um assistente financeiro pessoal inteligente e empático chamado Aura (modo local).
Você ajuda o usuário a gerenciar suas finanças pessoais de forma clara e objetiva.
Responda sempre em português brasileiro.

Regras:
- Quando o usuário quiser registrar uma transação (receita ou despesa), use registrar_transacao.
- Se faltarem informações essenciais (como categoria ou tipo), use solicitar_informacao_faltante com opções relevantes.
- Quando o usuário pedir simulação de parcelamento, use simular_fatura.
- Quando o usuário quiser criar uma meta financeira, use criar_meta.
- Quando o usuário quiser adicionar dinheiro a uma meta existente, use contribuir_meta.
- Quando o usuário quiser adicionar um ativo ao portfólio, use adicionar_investimento.
- Quando o usuário quiser registrar uma dívida ou empréstimo, use registrar_divida.
- Seja conciso mas completo. Forneça insights financeiros quando relevante.`;

const tools = [
  {
    type: 'function',
    function: {
      name: 'registrar_transacao',
      description: 'Registra uma transação financeira (receita ou despesa) no sistema.',
      parameters: {
        type: 'object',
        properties: {
          tipo: { type: 'string', enum: ['receita', 'despesa'], description: 'Tipo da transação.' },
          valor: { type: 'number', description: 'Valor da transação em reais. Sempre positivo.' },
          categoria: { type: 'string', description: 'Categoria. Ex: alimentação, transporte, salário, lazer, saúde, educação, moradia.' },
          descricao: { type: 'string', description: 'Descrição curta da transação.' },
          data: { type: 'string', description: 'Data no formato ISO 8601 (YYYY-MM-DD). Use a data atual se não informada.' },
        },
        required: ['tipo', 'valor', 'categoria'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'solicitar_informacao_faltante',
      description: 'Solicita ao usuário uma informação necessária para completar uma ação, apresentando opções clicáveis na interface.',
      parameters: {
        type: 'object',
        properties: {
          campo: { type: 'string', description: 'Nome do campo que está faltando. Ex: categoria, tipo.' },
          pergunta: { type: 'string', description: 'Pergunta clara a ser exibida ao usuário.' },
          opcoes: { type: 'array', items: { type: 'string' }, description: 'Lista de opções clicáveis. Mínimo 2, máximo 8.' },
        },
        required: ['campo', 'pergunta', 'opcoes'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'simular_fatura',
      description: 'Simula o parcelamento de uma compra, mostrando o valor de cada parcela com ou sem juros.',
      parameters: {
        type: 'object',
        properties: {
          valor_total: { type: 'number', description: 'Valor total da compra em reais.' },
          parcelas: { type: 'integer', description: 'Número de parcelas.' },
          taxa_juros_mensal: { type: 'number', description: 'Taxa de juros mensal em percentual (ex: 1.99 para 1,99%). Use 0 para sem juros.' },
        },
        required: ['valor_total', 'parcelas'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'criar_meta',
      description: 'Cria uma nova meta financeira (economizar, investir, comprar algo, viajar, etc.).',
      parameters: {
        type: 'object',
        properties: {
          nome: { type: 'string', description: 'Nome da meta. Ex: "Viagem para Europa", "Reserva de emergência".' },
          valor_alvo: { type: 'number', description: 'Valor total a ser alcançado em reais.' },
          tipo: { type: 'string', enum: ['economizar', 'investir', 'comprar', 'viajar', 'outros'], description: 'Tipo da meta.' },
          prazo: { type: 'string', description: 'Data limite no formato ISO 8601 (YYYY-MM-DD). Opcional.' },
        },
        required: ['nome', 'valor_alvo', 'tipo'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'contribuir_meta',
      description: 'Adiciona um aporte (contribuição em dinheiro) a uma meta financeira existente.',
      parameters: {
        type: 'object',
        properties: {
          nome_meta: { type: 'string', description: 'Nome ou parte do nome da meta para identificá-la.' },
          valor: { type: 'number', description: 'Valor a ser adicionado à meta em reais.' },
        },
        required: ['nome_meta', 'valor'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'adicionar_investimento',
      description: 'Adiciona um novo ativo ao portfólio de investimentos (ação, cripto, FII ou renda fixa).',
      parameters: {
        type: 'object',
        properties: {
          tipo: { type: 'string', enum: ['cripto', 'acao', 'renda_fixa', 'fii'], description: 'Tipo do investimento.' },
          ticker: { type: 'string', description: 'Código do ativo. Ex: "PETR4", "BTC", "HGLG11", "TESOURO_SELIC".' },
          quantidade: { type: 'number', description: 'Quantidade de ativos adquiridos.' },
          preco_medio: { type: 'number', description: 'Preço médio de compra por unidade em reais.' },
        },
        required: ['tipo', 'ticker', 'quantidade', 'preco_medio'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'registrar_divida',
      description: 'Registra uma nova dívida ou empréstimo.',
      parameters: {
        type: 'object',
        properties: {
          credor: { type: 'string', description: 'Nome do credor. Ex: "Banco Itaú", "Cartão Nubank".' },
          valor_total: { type: 'number', description: 'Valor total da dívida em reais.' },
          taxa_juros: { type: 'number', description: 'Taxa de juros mensal em percentual. Opcional.' },
          vencimento: { type: 'string', description: 'Data de vencimento no formato ISO 8601 (YYYY-MM-DD). Opcional.' },
        },
        required: ['credor', 'valor_total'],
      },
    },
  },
];

function parseFunctionCall(name: string, args: Record<string, unknown>): FunctionCallResult | undefined {
  switch (name) {
    case 'registrar_transacao':
      return {
        transacao: {
          tipo: args['tipo'] as string,
          valor: args['valor'] as number,
          categoria: args['categoria'] as string,
          descricao: args['descricao'] as string | undefined,
          data: args['data'] as string | undefined,
        },
      };
    case 'solicitar_informacao_faltante':
      return {
        solicitacao: {
          campo: args['campo'] as string,
          pergunta: args['pergunta'] as string,
          opcoes: args['opcoes'] as string[],
        },
      };
    case 'simular_fatura':
      return {
        simulacao: {
          valorTotal: args['valor_total'] as number,
          parcelas: args['parcelas'] as number,
          taxaJuros: (args['taxa_juros_mensal'] as number) ?? 0,
        },
      };
    case 'criar_meta':
      return {
        meta: {
          nome: args['nome'] as string,
          valorAlvo: args['valor_alvo'] as number,
          tipo: args['tipo'] as string,
          prazo: args['prazo'] as string | undefined,
        },
      };
    case 'contribuir_meta':
      return {
        contribuicaoMeta: {
          nomeMeta: args['nome_meta'] as string,
          valor: args['valor'] as number,
        },
      };
    case 'adicionar_investimento':
      return {
        investimento: {
          tipo: args['tipo'] as string,
          ticker: args['ticker'] as string,
          quantidade: args['quantidade'] as number,
          precoMedio: args['preco_medio'] as number,
        },
      };
    case 'registrar_divida':
      return {
        divida: {
          credor: args['credor'] as string,
          valorTotal: args['valor_total'] as number,
          taxaJuros: args['taxa_juros'] as number | undefined,
          vencimento: args['vencimento'] as string | undefined,
        },
      };
    default:
      return undefined;
  }
}

export async function chat(
  history: ChatMessage[],
  userMessage: string
): Promise<GeminiChatResponse> {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map(m => ({ role: m.role === 'model' ? 'assistant' : m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  const { data } = await axios.post(
    `${env.OLLAMA_BASE_URL}/api/chat`,
    { model: env.OLLAMA_MODEL, messages, tools, stream: false },
    { timeout: 120000 }
  );

  const message = data.message;
  const text: string = message?.content ?? '';
  const toolCall = message?.tool_calls?.[0];

  if (!toolCall) return { text };

  const fnName: string = toolCall.function.name;
  const args: Record<string, unknown> =
    typeof toolCall.function.arguments === 'string'
      ? JSON.parse(toolCall.function.arguments)
      : (toolCall.function.arguments ?? {});

  const functionCall = parseFunctionCall(fnName, args);
  return { text, functionCall };
}

export async function generateInsight(prompt: string): Promise<string> {
  const { data } = await axios.post(
    `${env.OLLAMA_BASE_URL}/api/chat`,
    {
      model: env.OLLAMA_MODEL,
      messages: [
        { role: 'system', content: 'Você é um assistente financeiro pessoal. Responda sempre em português brasileiro.' },
        { role: 'user', content: prompt },
      ],
      stream: false,
    },
    { timeout: 120000 }
  );
  return data.message?.content ?? '';
}

export async function isOllamaAvailable(): Promise<boolean> {
  try {
    await axios.get(`${env.OLLAMA_BASE_URL}/api/tags`, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}
