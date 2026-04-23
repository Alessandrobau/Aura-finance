import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { env } from '../config/env.js';

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY não configurada.');
  if (!client) client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  return client;
}

const SYSTEM_PROMPT = `Você é um assistente financeiro pessoal inteligente e empático chamado FinBot.
Você ajuda o usuário a gerenciar suas finanças pessoais de forma clara e objetiva.
Responda sempre em português brasileiro.
Quando o usuário quiser registrar uma transação (receita ou despesa), use a função registrar_transacao.
Seja conciso mas completo. Forneça insights financeiros quando relevante.`;

const transactionFunctions: FunctionDeclaration[] = [
  {
    name: 'registrar_transacao',
    description: 'Registra uma transação financeira (receita ou despesa) no sistema.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        tipo: {
          type: SchemaType.STRING,
          enum: ['receita', 'despesa'],
          description: 'Tipo da transação: receita (entrada de dinheiro) ou despesa (saída de dinheiro).',
        },
        valor: {
          type: SchemaType.NUMBER,
          description: 'Valor da transação em reais (BRL). Sempre positivo.',
        },
        categoria: {
          type: SchemaType.STRING,
          description: 'Categoria da transação. Ex: alimentação, transporte, salário, lazer, saúde, educação, moradia, investimento.',
        },
        descricao: {
          type: SchemaType.STRING,
          description: 'Descrição curta da transação.',
        },
        data: {
          type: SchemaType.STRING,
          description: 'Data da transação no formato ISO 8601 (YYYY-MM-DD). Use a data atual se não informada.',
        },
      },
      required: ['tipo', 'valor', 'categoria'],
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
    tools: [{ functionDeclarations: transactionFunctions }],
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
