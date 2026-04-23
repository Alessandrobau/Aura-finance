import { FormEvent, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aiApi, ChatMessage, ChatSimulacao, ChatSolicitacao } from "@/api/ai";
import { fmtBRL } from "@/lib/format";
import { Sparkles, Send, CircleCheck, Calculator } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

interface UiMessage extends ChatMessage {
  id: string;
  transacao?: { tipo: "receita" | "despesa"; valor: string; categoria: string };
  solicitacao?: ChatSolicitacao;
  simulacao?: ChatSimulacao;
}

const WELCOME: UiMessage = {
  id: "welcome",
  role: "model",
  content:
    'Olá! Sou Aura, sua assistente financeira. Posso registrar transações, simular parcelas e analisar seus gastos. Tente: "Gastei R$ 50 no almoço" ou "Simule R$ 1200 em 6x".',
};

const ChatPage = () => {
  const [messages, setMessages] = useState<UiMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<string>("auto");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: UiMessage = { id: uid(), role: "user", content: text };
    const historico: ChatMessage[] = messages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const r = await aiApi.chat(text, historico, "auto");
      setProvider(r.provider);
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "model",
          content: r.resposta,
          transacao: r.transacaoCriada
            ? { tipo: r.transacaoCriada.tipo, valor: r.transacaoCriada.valor, categoria: r.transacaoCriada.categoria }
            : undefined,
          solicitacao: r.solicitacao,
          simulacao: r.simulacao,
        },
      ]);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || "Não foi possível processar.");
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "model", content: "Desculpe, tive um problema ao responder. Tente novamente." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    setInput("");
    sendMessage(text);
  };

  const providerLabel =
    provider === "gemini" ? "Gemini" : provider === "ollama" ? "Ollama (Local)" : "Auto";

  return (
    <div className="h-dvh flex flex-col">
      <div className="p-12 max-w-3xl mx-auto w-full flex flex-col gap-6 flex-1 min-h-0">
        <PageHeader
          eyebrow="Assistente"
          title="Aura, sua IA financeira."
          description="Converse para registrar gastos, entender seu fluxo ou pedir conselhos."
          action={
            <span className="text-xs uppercase tracking-widest text-muted-foreground bg-muted px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <Sparkles className="size-3" /> {providerLabel}
            </span>
          }
        />

        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto bg-surface rounded-2xl border border-border shadow-card p-6 flex flex-col gap-4"
        >
          {messages.map((m) => (
            <div key={m.id} className={cn("flex flex-col", m.role === "user" ? "items-end" : "items-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line animate-fade-in",
                  m.role === "user"
                    ? "bg-foreground text-background rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                )}
              >
                {m.content}

                {m.transacao && (
                  <div className="mt-3 p-3 rounded-xl bg-surface border border-border text-foreground flex items-center gap-2 text-xs">
                    <CircleCheck className="size-4 text-sage shrink-0" />
                    <span>
                      <span className="font-medium capitalize">{m.transacao.tipo}</span>
                      {" · "}
                      <span className="tabular-nums">{fmtBRL(m.transacao.valor)}</span>
                      {" · "}
                      <span className="capitalize">{m.transacao.categoria}</span>
                    </span>
                  </div>
                )}

                {m.simulacao && (
                  <div className="mt-3 p-3 rounded-xl bg-surface border border-border text-foreground text-xs space-y-1.5">
                    <div className="flex items-center gap-2 mb-2">
                      <Calculator className="size-4 shrink-0" />
                      <span className="font-medium">Simulação de Parcelamento</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor total</span>
                      <span className="tabular-nums">{fmtBRL(m.simulacao.valorTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Parcelas</span>
                      <span>
                        {m.simulacao.parcelas}x de{" "}
                        <span className="tabular-nums font-medium">{fmtBRL(m.simulacao.valorParcela)}</span>
                      </span>
                    </div>
                    {m.simulacao.taxaJuros > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Juros mensais</span>
                          <span>{m.simulacao.taxaJuros}%</span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-1.5">
                          <span className="text-muted-foreground">Total com juros</span>
                          <span className="tabular-nums font-medium">{fmtBRL(m.simulacao.total)}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {m.solicitacao && (
                <div className="flex flex-wrap gap-2 mt-2 max-w-[85%]">
                  {m.solicitacao.opcoes.map((op) => (
                    <button
                      key={op}
                      onClick={() => sendMessage(op)}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-full border border-border text-sm bg-surface hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      {op}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 text-sm flex gap-1">
                <span className="size-1.5 bg-muted-foreground rounded-full animate-pulse" />
                <span className="size-1.5 bg-muted-foreground rounded-full animate-pulse [animation-delay:0.15s]" />
                <span className="size-1.5 bg-muted-foreground rounded-full animate-pulse [animation-delay:0.3s]" />
              </div>
            </div>
          )}
        </div>

        <form onSubmit={submit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte ou registre algo..."
            disabled={loading}
            className="bg-surface"
          />
          <Button type="submit" disabled={loading || !input.trim()} className="gap-2">
            <Send className="size-4" /> Enviar
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;
