import api from "./client";

export interface Divida {
  id: string;
  credor: string;
  valorTotal: number;
  valorPago: number;
  taxaJuros?: number;
  vencimento?: string | null;
  valorPendente: number;
  percentualPago: number;
  quitada: boolean;
}

export interface DebtsResponse {
  dividas: Divida[];
  totalDivida: number;
}

export const debtsApi = {
  list: () => api.get<DebtsResponse>(`/api/debts`).then((r) => r.data),
  create: (body: { credor: string; valorTotal: number; valorPago?: number; taxaJuros?: number; vencimento?: string }) =>
    api.post<Divida>(`/api/debts`, body).then((r) => r.data),
  update: (id: string, body: Partial<Divida>) => api.put<Divida>(`/api/debts/${id}`, body).then((r) => r.data),
  pay: (id: string, valor: number) => api.patch<Divida>(`/api/debts/${id}/pay`, { valor }).then((r) => r.data),
  remove: (id: string) => api.delete(`/api/debts/${id}`),
};
