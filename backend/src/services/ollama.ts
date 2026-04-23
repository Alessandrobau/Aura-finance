import axios from 'axios';
import { env } from '../config/env.js';

const SYSTEM_PROMPT = `Você é um assistente financeiro pessoal inteligente chamado FinBot (modo local).
Você ajuda o usuário a gerenciar suas finanças pessoais. Responda sempre em português brasileiro.
Quando o usuário mencionar uma transação financeira, extraia: tipo (receita/despesa), valor, categoria e descrição.
Se identificar uma transação, inclua no final da resposta o JSON: {"_transacao": {"tipo": "...", "valor": ..., "categoria": "...", "descricao": "..."}}`;

export interface OllamaResponse {
  text: string;
  transacao?: {
    tipo: string;
    valor: number;
    categoria: string;
    descricao?: string;
  };
}

export async function ollamaChat(
  history: Array<{ role: string; content: string }>,
  userMessage: string
): Promise<OllamaResponse> {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  const { data } = await axios.post(
    `${env.OLLAMA_BASE_URL}/api/chat`,
    { model: env.OLLAMA_MODEL, messages, stream: false },
    { timeout: 60000 }
  );

  const text: string = data.message?.content ?? '';

  const jsonMatch = text.match(/\{"_transacao":\s*(\{[^}]+\})\}/);
  if (jsonMatch) {
    try {
      const transacao = JSON.parse(jsonMatch[1]);
      const cleanText = text.replace(jsonMatch[0], '').trim();
      return { text: cleanText, transacao };
    } catch {
      // ignore parse error
    }
  }

  return { text };
}

export async function isOllamaAvailable(): Promise<boolean> {
  try {
    await axios.get(`${env.OLLAMA_BASE_URL}/api/tags`, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}
