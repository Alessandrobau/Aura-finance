import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: rota inexistente:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <div className="text-center max-w-md px-6">
        <div className="font-serif text-7xl tracking-tight mb-2">404</div>
        <p className="font-serif text-2xl tracking-tight mb-3">Página não encontrada</p>
        <p className="text-muted-foreground mb-8">
          O endereço acessado não existe ou foi movido.
        </p>
        <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition">
          Voltar para o início
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
