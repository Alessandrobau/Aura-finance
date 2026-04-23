import { createContext, useContext, useEffect, useReducer, ReactNode, useCallback } from "react";
import { authApi, User } from "@/api/auth";

interface AuthState {
  user: User | null;
  loading: boolean;
}

type Action =
  | { type: "INIT_LOADING" }
  | { type: "SET_USER"; user: User | null }
  | { type: "LOGOUT" };

const reducer = (state: AuthState, action: Action): AuthState => {
  switch (action.type) {
    case "INIT_LOADING":
      return { ...state, loading: true };
    case "SET_USER":
      return { user: action.user, loading: false };
    case "LOGOUT":
      return { user: null, loading: false };
    default:
      return state;
  }
};

interface AuthContextValue extends AuthState {
  login: (email: string, senha: string) => Promise<void>;
  register: (nome: string, email: string, senha: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, { user: null, loading: true });

  useEffect(() => {
    const token = localStorage.getItem("financeapp_token");
    if (!token) {
      dispatch({ type: "SET_USER", user: null });
      return;
    }
    authApi
      .me()
      .then((user) => dispatch({ type: "SET_USER", user }))
      .catch(() => {
        localStorage.removeItem("financeapp_token");
        dispatch({ type: "SET_USER", user: null });
      });
  }, []);

  const login = useCallback(async (email: string, senha: string) => {
    const { user, token } = await authApi.login({ email, senha });
    localStorage.setItem("financeapp_token", token);
    dispatch({ type: "SET_USER", user });
  }, []);

  const register = useCallback(async (nome: string, email: string, senha: string) => {
    const { user, token } = await authApi.register({ nome, email, senha });
    localStorage.setItem("financeapp_token", token);
    dispatch({ type: "SET_USER", user });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("financeapp_token");
    dispatch({ type: "LOGOUT" });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
