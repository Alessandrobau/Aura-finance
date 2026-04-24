import api from "./client";

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export interface ChatSolicitacao {
  campo: string;
  pergunta: string;
  opcoes: string[];
}

export interface ChatSimulacao {
  valorTotal: number;
  parcelas: number;
  valorParcela: number;
  taxaJuros: number;
  total: number;
}

export interface ChatMetaCriada {
  id: string;
  nome: string;
  valorAlvo: string;
  tipo: string;
  prazo?: string | null;
}

export interface ChatContribuicaoMeta {
  metaNome: string;
  valorContribuido: number;
  valorAtual: number;
  valorAlvo: number;
  percentual: number;
}

export interface ChatInvestimentoAdicionado {
  id: string;
  tipo: string;
  ticker: string;
  quantidade: string;
  precoMedio: string;
}

export interface ChatDividaCriada {
  id: string;
  credor: string;
  valorTotal: string;
  taxaJuros?: string | null;
  vencimento?: string | null;
}

export interface ChatResponse {
  resposta: string;
  provider: string;
  transacaoCriada?: {
    id: string;
    tipo: "receita" | "despesa";
    valor: string;
    categoria: string;
    criadoPorIa: boolean;
  };
  solicitacao?: ChatSolicitacao;
  simulacao?: ChatSimulacao;
  metaCriada?: ChatMetaCriada;
  contribuicaoMeta?: ChatContribuicaoMeta;
  investimentoAdicionado?: ChatInvestimentoAdicionado;
  dividaCriada?: ChatDividaCriada;
}

export const aiApi = {
  chat: (mensagem: string, historico: ChatMessage[], provider: "auto" | "gemini" | "ollama" = "auto") =>
    api.post<ChatResponse>(`/api/ai/chat`, { mensagem, historico, provider }).then((r) => r.data),
  weeklySummary: () => api.get<{ insight: string }>(`/api/ai/insights/weekly-summary`).then((r) => r.data),
  goalAdvice: (id: string) =>
    api.get<{ insight: string; meta?: unknown; contextoFinanceiro?: unknown }>(`/api/ai/insights/goal-advice/${id}`).then((r) => r.data),
  anomalies: () => api.get<{ insight: string }>(`/api/ai/insights/anomalies`).then((r) => r.data),
  categorize: (descricao: string) => api.post<{ categoria: string }>(`/api/ai/insights/categorize`, { descricao }).then((r) => r.data),
};
