import { FormEvent, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aiApi, ChatMessage, ChatSimulacao, ChatSolicitacao } from "@/api/ai";
import { fmtBRL } from "@/lib/format";
import { Sparkles, Send, CircleCheck, Calculator } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UiMessage extends ChatMessage {
  id: string;
  transacao?: { tipo: "receita" | "despesa"; valor: string; categoria: string };
  solicitacao?: ChatSolicitacao;
  simulacao?: ChatSimulacao;
}

const WELCOME: UiMessage = {
  id: "welcome",
  role: "model",
  content: "Olá! Como posso ajudar com suas finanças hoje?",
};

export function FloatingChat() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // Don't render on the full chat page to avoid confusion
  if (location.pathname === "/chat") return null;

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
      toast.error(msg || "Erro ao processar.");
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

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 size-14 rounded-full bg-foreground text-background shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        aria-label="Abrir assistente IA"
      >
        <Sparkles className="size-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[420px] flex flex-col p-0 gap-0">
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-muted-foreground" />
              <SheetTitle className="text-base font-serif font-normal tracking-tight">Aura IA</SheetTitle>
            </div>
          </SheetHeader>

          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-3">
            {messages.map((m) => (
              <div key={m.id} className={cn("flex flex-col", m.role === "user" ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line",
                    m.role === "user"
                      ? "bg-foreground text-background rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  )}
                >
                  {m.content}

                  {m.transacao && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-background border border-border flex items-center gap-2 text-xs">
                      <CircleCheck className="size-3.5 text-sage shrink-0" />
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
                    <div className="mt-2.5 p-2.5 rounded-xl bg-background border border-border text-xs space-y-1">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Calculator className="size-3.5 shrink-0" />
                        <span className="font-medium">Simulação</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total</span>
                        <span className="tabular-nums">{fmtBRL(m.simulacao.valorTotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Parcela</span>
                        <span className="font-medium tabular-nums">
                          {m.simulacao.parcelas}x de {fmtBRL(m.simulacao.valorParcela)}
                        </span>
                      </div>
                      {m.simulacao.taxaJuros > 0 && (
                        <div className="flex justify-between border-t border-border pt-1">
                          <span className="text-muted-foreground">Total c/ juros</span>
                          <span className="tabular-nums font-medium">{fmtBRL(m.simulacao.total)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {m.solicitacao && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5 max-w-[90%]">
                    {m.solicitacao.opcoes.map((op) => (
                      <button
                        key={op}
                        onClick={() => sendMessage(op)}
                        disabled={loading}
                        className="px-3 py-1 rounded-full border border-border text-xs bg-background hover:bg-muted transition-colors disabled:opacity-50"
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
                <div className="bg-muted rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex gap-1">
                  <span className="size-1.5 bg-muted-foreground rounded-full animate-pulse" />
                  <span className="size-1.5 bg-muted-foreground rounded-full animate-pulse [animation-delay:0.15s]" />
                  <span className="size-1.5 bg-muted-foreground rounded-full animate-pulse [animation-delay:0.3s]" />
                </div>
              </div>
            )}
          </div>

          <form onSubmit={submit} className="px-4 py-4 border-t border-border flex gap-2 shrink-0">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Mensagem..."
              disabled={loading}
              className="text-sm"
            />
            <Button type="submit" size="sm" disabled={loading || !input.trim()} className="shrink-0">
              <Send className="size-4" />
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
