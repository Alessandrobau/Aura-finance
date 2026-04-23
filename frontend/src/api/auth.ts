import api from "./client";

export interface User {
  id: string;
  nome: string;
  email: string;
  criadoEm?: string;
}

export const authApi = {
  register: (data: { nome: string; email: string; senha: string }) =>
    api.post<{ user: User; token: string }>("/api/auth/register", data).then((r) => r.data),
  login: (data: { email: string; senha: string }) =>
    api.post<{ user: User; token: string }>("/api/auth/login", data).then((r) => r.data),
  me: () => api.get<User>("/api/auth/me").then((r) => r.data),
};
