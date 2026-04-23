import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  Target,
  Wallet,
  Sparkles,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Visão Geral", icon: LayoutDashboard, end: true },
  { to: "/transactions", label: "Transações", icon: ArrowLeftRight },
  { to: "/investments", label: "Portfólio", icon: TrendingUp },
  { to: "/goals", label: "Objetivos", icon: Target },
  { to: "/debts", label: "Compromissos", icon: Wallet },
  { to: "/chat", label: "Assistente IA", icon: Sparkles },
];

export const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials = user?.nome
    ? user.nome
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "??";

  return (
    <div className="min-h-dvh flex bg-background text-foreground">
      <aside className="w-64 shrink-0 bg-sidebar border-r border-border flex flex-col px-6 py-10 sticky top-0 h-dvh">
        <div className="font-serif text-2xl tracking-tight mb-12 px-3">Aura.</div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                  isActive
                    ? "bg-surface shadow-soft text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )
              }
            >
              <item.icon className="size-4" strokeWidth={1.75} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-4">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="size-9 rounded-full bg-sand flex items-center justify-center text-xs font-serif font-medium text-foreground shrink-0">
              {initials}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{user?.nome}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            </div>
            <button
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
              aria-label="Sair"
              title="Sair"
            >
              <LogOut className="size-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};
