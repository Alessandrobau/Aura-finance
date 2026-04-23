import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, senha);
      navigate("/");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh grid lg:grid-cols-2 bg-background">
      <aside className="hidden lg:flex flex-col justify-between bg-sidebar border-r border-border p-12">
        <div className="font-serif text-2xl tracking-tight">Aura.</div>
        <div className="max-w-md">
          <div className="font-serif text-4xl tracking-tight text-balance mb-4">
            Sua vida financeira, com clareza.
          </div>
          <p className="text-muted-foreground text-pretty">
            Acompanhe receitas, despesas, investimentos e metas em uma interface tranquila e direta.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">© Aura · Finance</div>
      </aside>

      <main className="flex items-center justify-center p-8">
        <form onSubmit={onSubmit} className="w-full max-w-sm flex flex-col gap-6">
          <div className="mb-2">
            <h1 className="font-serif text-3xl tracking-tight mb-1">Bem-vindo de volta.</h1>
            <p className="text-sm text-muted-foreground">Entre para continuar acompanhando suas finanças.</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="senha">Senha</Label>
            <Input id="senha" type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Entrando..." : "Entrar"}
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            Não tem conta?{" "}
            <Link to="/register" className="text-foreground font-medium hover:underline">
              Cadastre-se
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
};

export default LoginPage;
