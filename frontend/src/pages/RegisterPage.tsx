import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(nome, email, senha);
      navigate("/");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Não foi possível cadastrar.");
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
            Comece com tranquilidade.
          </div>
          <p className="text-muted-foreground text-pretty">
            Em poucos minutos você terá um panorama completo das suas finanças, com a ajuda de um assistente IA.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">© Aura · Finance</div>
      </aside>

      <main className="flex items-center justify-center p-8">
        <form onSubmit={onSubmit} className="w-full max-w-sm flex flex-col gap-6">
          <div className="mb-2">
            <h1 className="font-serif text-3xl tracking-tight mb-1">Criar uma conta.</h1>
            <p className="text-sm text-muted-foreground">Leva menos de um minuto.</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome completo" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="senha">Senha</Label>
            <Input id="senha" type="password" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Criando..." : "Criar conta"}
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            Já tem conta?{" "}
            <Link to="/login" className="text-foreground font-medium hover:underline">
              Entrar
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
};

export default RegisterPage;
