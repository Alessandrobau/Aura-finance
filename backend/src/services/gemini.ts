import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { env } from '../config/env.js';

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY não configurada.');
  if (!client) client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  return client;
}

const SYSTEM_PROMPT = `Você é um assistente financeiro pessoal inteligente e empático chamado Aura.
Você ajuda o usuário a gerenciar suas finanças pessoais de forma clara e objetiva.
Responda sempre em português brasileiro.

Regras:
- Quando o usuário quiser registrar uma transação (receita ou despesa), use registrar_transacao.
- Se faltarem informações essenciais (como categoria ou tipo) para registrar a transação, use solicitar_informacao_faltante com opções relevantes em vez de presumir.
- Quando o usuário pedir simulação de parcelamento ou quiser saber o valor de uma parcela, use simular_fatura.
- Quando o usuário quiser criar uma meta financeira (economizar, investir, comprar algo, viajar), use criar_meta.
- Quando o usuário quiser adicionar dinheiro a uma meta existente, use contribuir_meta com o nome (ou parte do nome) da meta e o valor.
- Quando o usuário quiser adicionar um ativo ao portfólio (ação, cripto, FII, renda fixa), use adicionar_investimento.
- Quando o usuário quiser registrar uma dívida ou empréstimo, use registrar_divida.
- Seja conciso mas completo. Forneça insights financeiros quando relevante.`;

const financeFunctions: FunctionDeclaration[] = [
  {
    name: 'registrar_transacao',
    description: 'Registra uma transação financeira (receita ou despesa) no sistema.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        tipo: {
          type: SchemaType.STRING,
          enum: ['receita', 'despesa'],
          description: 'Tipo da transação: receita (entrada) ou despesa (saída).',
        },
        valor: {
          type: SchemaType.NUMBER,
          description: 'Valor da transação em reais. Sempre positivo.',
        },
        categoria: {
          type: SchemaType.STRING,
          description: 'Categoria. Ex: alimentação, transporte, salário, lazer, saúde, educação, moradia.',
        },
        descricao: {
          type: SchemaType.STRING,
          description: 'Descrição curta da transação.',
        },
        data: {
          type: SchemaType.STRING,
          description: 'Data no formato ISO 8601 (YYYY-MM-DD). Use a data atual se não informada.',
        },
      },
      required: ['tipo', 'valor', 'categoria'],
    },
  },
  {
    name: 'solicitar_informacao_faltante',
    description: 'Solicita ao usuário uma informação necessária para completar uma ação, apresentando opções clicáveis na interface.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        campo: {
          type: SchemaType.STRING,
          description: 'Nome do campo que está faltando. Ex: categoria, tipo.',
        },
        pergunta: {
          type: SchemaType.STRING,
          description: 'Pergunta clara a ser exibida ao usuário.',
        },
        opcoes: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: 'Lista de opções clicáveis. Mínimo 2, máximo 8.',
        },
      },
      required: ['campo', 'pergunta', 'opcoes'],
    },
  },
  {
    name: 'simular_fatura',
    description: 'Simula o parcelamento de uma compra, mostrando o valor de cada parcela com ou sem juros.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        valor_total: {
          type: SchemaType.NUMBER,
          description: 'Valor total da compra em reais.',
        },
        parcelas: {
          type: SchemaType.INTEGER,
          description: 'Número de parcelas.',
        },
        taxa_juros_mensal: {
          type: SchemaType.NUMBER,
          description: 'Taxa de juros mensal em percentual (ex: 1.99 para 1,99%). Use 0 para sem juros.',
        },
      },
      required: ['valor_total', 'parcelas'],
    },
  },
  {
    name: 'criar_meta',
    description: 'Cria uma nova meta financeira (economizar, investir, comprar algo, viajar, etc.).',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        nome: {
          type: SchemaType.STRING,
          description: 'Nome da meta. Ex: "Viagem para Europa", "Reserva de emergência".',
        },
        valor_alvo: {
          type: SchemaType.NUMBER,
          description: 'Valor total a ser alcançado em reais.',
        },
        tipo: {
          type: SchemaType.STRING,
          enum: ['economizar', 'investir', 'comprar', 'viajar', 'outros'],
          description: 'Tipo da meta.',
        },
        prazo: {
          type: SchemaType.STRING,
          description: 'Data limite no formato ISO 8601 (YYYY-MM-DD). Opcional.',
        },
      },
      required: ['nome', 'valor_alvo', 'tipo'],
    },
  },
  {
    name: 'contribuir_meta',
    description: 'Adiciona um aporte (contribuição em dinheiro) a uma meta financeira existente.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        nome_meta: {
          type: SchemaType.STRING,
          description: 'Nome ou parte do nome da meta para identificá-la. Ex: "viagem", "reserva".',
        },
        valor: {
          type: SchemaType.NUMBER,
          description: 'Valor a ser adicionado à meta em reais.',
        },
      },
      required: ['nome_meta', 'valor'],
    },
  },
  {
    name: 'adicionar_investimento',
    description: 'Adiciona um novo ativo ao portfólio de investimentos (ação, cripto, FII ou renda fixa).',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        tipo: {
          type: SchemaType.STRING,
          enum: ['cripto', 'acao', 'renda_fixa', 'fii'],
          description: 'Tipo do investimento.',
        },
        ticker: {
          type: SchemaType.STRING,
          description: 'Código do ativo. Ex: "PETR4", "BTC", "HGLG11", "TESOURO_SELIC".',
        },
        quantidade: {
          type: SchemaType.NUMBER,
          description: 'Quantidade de ativos adquiridos.',
        },
        preco_medio: {
          type: SchemaType.NUMBER,
          description: 'Preço médio de compra por unidade em reais.',
        },
      },
      required: ['tipo', 'ticker', 'quantidade', 'preco_medio'],
    },
  },
  {
    name: 'registrar_divida',
    description: 'Registra uma nova dívida ou empréstimo.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        credor: {
          type: SchemaType.STRING,
          description: 'Nome do credor. Ex: "Banco Itaú", "Cartão Nubank", "Empréstimo pessoal".',
        },
        valor_total: {
          type: SchemaType.NUMBER,
          description: 'Valor total da dívida em reais.',
        },
        taxa_juros: {
          type: SchemaType.NUMBER,
          description: 'Taxa de juros mensal em percentual. Ex: 1.99. Opcional.',
        },
        vencimento: {
          type: SchemaType.STRING,
          description: 'Data de vencimento no formato ISO 8601 (YYYY-MM-DD). Opcional.',
        },
      },
      required: ['credor', 'valor_total'],
    },
  },
];

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface FunctionCallResult {
  transacao?: {
    tipo: string;
    valor: number;
    categoria: string;
    descricao?: string;
    data?: string;
  };
  solicitacao?: {
    campo: string;
    pergunta: string;
    opcoes: string[];
  };
  simulacao?: {
    valorTotal: number;
    parcelas: number;
    taxaJuros: number;
  };
  meta?: {
    nome: string;
    valorAlvo: number;
    tipo: string;
    prazo?: string;
  };
  contribuicaoMeta?: {
    nomeMeta: string;
    valor: number;
  };
  investimento?: {
    tipo: string;
    ticker: string;
    quantidade: number;
    precoMedio: number;
  };
  divida?: {
    credor: string;
    valorTotal: number;
    taxaJuros?: number;
    vencimento?: string;
  };
}

export interface GeminiChatResponse {
  text: string;
  functionCall?: FunctionCallResult;
}

export async function chat(
  history: ChatMessage[],
  userMessage: string
): Promise<GeminiChatResponse> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    systemInstruction: SYSTEM_PROMPT,
    tools: [{ functionDeclarations: financeFunctions }],
  });

  const geminiHistory = history.map(m => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  const chatSession = model.startChat({ history: geminiHistory });
  const result = await chatSession.sendMessage(userMessage);
  const response = result.response;

  const functionCall = response.functionCalls()?.[0];

  if (functionCall?.name === 'registrar_transacao') {
    const args = functionCall.args as Record<string, unknown>;
    const confirmText =
      response.text() ||
      `Transação registrada: ${args['tipo']} de R$ ${Number(args['valor']).toFixed(2)} em ${args['categoria']}.`;
    return {
      text: confirmText,
      functionCall: {
        transacao: {
          tipo: args['tipo'] as string,
          valor: args['valor'] as number,
          categoria: args['categoria'] as string,
          descricao: args['descricao'] as string | undefined,
          data: args['data'] as string | undefined,
        },
      },
    };
  }

  if (functionCall?.name === 'solicitar_informacao_faltante') {
    const args = functionCall.args as Record<string, unknown>;
    return {
      text: response.text() || (args['pergunta'] as string),
      functionCall: {
        solicitacao: {
          campo: args['campo'] as string,
          pergunta: args['pergunta'] as string,
          opcoes: args['opcoes'] as string[],
        },
      },
    };
  }

  if (functionCall?.name === 'simular_fatura') {
    const args = functionCall.args as Record<string, unknown>;
    return {
      text: response.text() || '',
      functionCall: {
        simulacao: {
          valorTotal: args['valor_total'] as number,
          parcelas: args['parcelas'] as number,
          taxaJuros: (args['taxa_juros_mensal'] as number) || 0,
        },
      },
    };
  }

  if (functionCall?.name === 'criar_meta') {
    const args = functionCall.args as Record<string, unknown>;
    return {
      text: response.text() || `Meta "${args['nome']}" criada com sucesso!`,
      functionCall: {
        meta: {
          nome: args['nome'] as string,
          valorAlvo: args['valor_alvo'] as number,
          tipo: args['tipo'] as string,
          prazo: args['prazo'] as string | undefined,
        },
      },
    };
  }

  if (functionCall?.name === 'contribuir_meta') {
    const args = functionCall.args as Record<string, unknown>;
    return {
      text: response.text() || `Aporte adicionado à meta!`,
      functionCall: {
        contribuicaoMeta: {
          nomeMeta: args['nome_meta'] as string,
          valor: args['valor'] as number,
        },
      },
    };
  }

  if (functionCall?.name === 'adicionar_investimento') {
    const args = functionCall.args as Record<string, unknown>;
    return {
      text: response.text() || `Investimento em ${args['ticker']} adicionado ao portfólio!`,
      functionCall: {
        investimento: {
          tipo: args['tipo'] as string,
          ticker: args['ticker'] as string,
          quantidade: args['quantidade'] as number,
          precoMedio: args['preco_medio'] as number,
        },
      },
    };
  }

  if (functionCall?.name === 'registrar_divida') {
    const args = functionCall.args as Record<string, unknown>;
    return {
      text: response.text() || `Dívida com ${args['credor']} registrada.`,
      functionCall: {
        divida: {
          credor: args['credor'] as string,
          valorTotal: args['valor_total'] as number,
          taxaJuros: args['taxa_juros'] as number | undefined,
          vencimento: args['vencimento'] as string | undefined,
        },
      },
    };
  }

  return { text: response.text() };
}

export async function generateInsight(prompt: string): Promise<string> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

  const result = await model.generateContent([
    { text: `${SYSTEM_PROMPT}\n\n${prompt}` },
  ]);
  return result.response.text();
}
