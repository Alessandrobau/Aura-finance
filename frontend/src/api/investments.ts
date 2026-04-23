import api from "./client";

export type TipoInvestimento = "acao" | "cripto" | "renda_fixa" | "fii";

export interface Investimento {
  id: string;
  tipo: TipoInvestimento;
  ticker: string;
  quantidade: string;
  precoMedio: string;
  precoAtual: number;
  valorAtual: number;
  valorInvestido: number;
  lucroPrejuizo: number;
  lucroPrejuizoPercent: number;
  cotacao?: { preco: number; variacao: number; variacaoPercent: number; nome: string };
}

export interface PortfolioResponse {
  investimentos: Investimento[];
  patrimonioTotal: number;
  cotacoes: Record<string, unknown>;
}

export const investmentsApi = {
  list: () => api.get<PortfolioResponse>(`/api/investments`).then((r) => r.data),
  create: (body: { tipo: TipoInvestimento; ticker: string; quantidade: number; precoMedio: number }) =>
    api.post<Investimento>(`/api/investments`, body).then((r) => r.data),
  update: (id: string, body: { quantidade?: number; precoMedio?: number }) =>
    api.put<Investimento>(`/api/investments/${id}`, body).then((r) => r.data),
  remove: (id: string) => api.delete(`/api/investments/${id}`),
  quote: (ticker: string) =>
    api.get<{ preco: number; variacao: number; variacaoPercent: number; nome: string }>(`/api/investments/quote/${ticker}`).then((r) => r.data),
};
