import api from "./client";

export type TipoMeta = "economizar" | "investir" | "comprar" | "viajar" | "outros";

export interface Meta {
  id: string;
  nome: string;
  tipo: TipoMeta;
  valorAlvo: number;
  valorAtual: number;
  prazo?: string | null;
  percentualConcluido: number;
  valorRestante: number;
  concluida: boolean;
}

export const goalsApi = {
  list: () => api.get<Meta[]>(`/api/goals`).then((r) => r.data),
  create: (body: { nome: string; valorAlvo: number; valorAtual?: number; tipo: TipoMeta; prazo?: string }) =>
    api.post<Meta>(`/api/goals`, body).then((r) => r.data),
  update: (id: string, body: Partial<Meta>) => api.put<Meta>(`/api/goals/${id}`, body).then((r) => r.data),
  contribute: (id: string, valor: number) => api.patch<Meta>(`/api/goals/${id}/contribute`, { valor }).then((r) => r.data),
  remove: (id: string) => api.delete(`/api/goals/${id}`),
};
