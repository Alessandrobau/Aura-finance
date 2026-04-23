import api from "./client";

export type TipoTransacao = "receita" | "despesa";

export interface Transacao {
  id: string;
  tipo: TipoTransacao;
  valor: string;
  categoria: string;
  descricao?: string;
  data: string;
  criadoPorIa?: boolean;
}

export interface SummaryResponse {
  receitas: number;
  despesas: number;
  saldo: number;
  porCategoria: Record<string, { total: number; tipo: TipoTransacao }>;
  periodo: { mes: number; ano: number };
}

export interface AnnualResponse {
  ano: number;
  meses: { mes: number; receitas: number; despesas: number; saldo: number }[];
}

export interface ListResponse {
  data: Transacao[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export const transactionsApi = {
  summary: (mes: number, ano: number) =>
    api.get<SummaryResponse>(`/api/transactions/summary`, { params: { mes, ano } }).then((r) => r.data),
  annual: (ano: number) =>
    api.get<AnnualResponse>(`/api/transactions/annual`, { params: { ano } }).then((r) => r.data),
  list: (params: { mes?: number; ano?: number; tipo?: TipoTransacao; categoria?: string; page?: number; limit?: number }) =>
    api.get<ListResponse>(`/api/transactions`, { params }).then((r) => r.data),
  create: (body: Partial<Transacao>) => api.post<Transacao>(`/api/transactions`, body).then((r) => r.data),
  update: (id: string, body: Partial<Transacao>) => api.put<Transacao>(`/api/transactions/${id}`, body).then((r) => r.data),
  remove: (id: string) => api.delete(`/api/transactions/${id}`),
};
