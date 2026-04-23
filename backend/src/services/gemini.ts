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
- Quando o usuário quiser registrar uma transação (receita ou despesa), use a função registrar_transacao.
- Se faltarem informações essenciais (como categoria ou tipo) para registrar a transação, use solicitar_informacao_faltante com opções relevantes em vez de presumir.
- Quando o usuário pedir simulação de parcelamento ou quiser saber o valor de uma parcela, use simular_fatura.
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
