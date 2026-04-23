import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Loading, EmptyState } from "@/components/ui-kit/States";
import { CircularProgress } from "@/components/Charts/CircularProgress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Sparkles, Trash2, Pencil, PlusCircle } from "lucide-react";
import { goalsApi, Meta, TipoMeta } from "@/api/goals";
import { aiApi } from "@/api/ai";
import { fmtBRL, fmtDate, daysUntil } from "@/lib/format";
import { toast } from "sonner";

const TIPO_LABEL: Record<TipoMeta, string> = {
  economizar: "Economizar",
  investir: "Investir",
  comprar: "Comprar",
  viajar: "Viajar",
  outros: "Outros",
};

const GoalsPage = () => {
  const [items, setItems] = useState<Meta[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Meta | null>(null);
  const [contributeMeta, setContributeMeta] = useState<Meta | null>(null);
  const [adviceMeta, setAdviceMeta] = useState<Meta | null>(null);
  const [advice, setAdvice] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      setItems(await goalsApi.list());
    } catch {
      toast.error("Erro ao carregar metas.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta meta?")) return;
    try { await goalsApi.remove(id); toast.success("Excluída."); fetchData(); }
    catch { toast.error("Não foi possível excluir."); }
  };

  const handleAdvice = async (m: Meta) => {
    setAdviceMeta(m);
    setAdvice("");
    try {
      const r = await aiApi.goalAdvice(m.id);
      setAdvice(r.insight);
    } catch {
      setAdvice("Não foi possível obter conselhos agora.");
    }
  };

  return (
    <div className="p-12 max-w-6xl mx-auto flex flex-col gap-10 animate-fade-in">
      <PageHeader
        eyebrow="Objetivos"
        title="Metas"
        description="Defina alvos, registre contribuições e acompanhe seu progresso com calma."
        action={
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2">
            <Plus className="size-4" /> Nova meta
          </Button>
        }
      />

      {loading ? <Loading /> : items.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-border shadow-card p-8">
          <EmptyState title="Sem metas ainda" description="Comece criando uma meta de poupança ou viagem." />
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((m) => {
            const days = daysUntil(m.prazo);
            return (
              <div key={m.id} className="bg-surface rounded-2xl border border-border shadow-card p-6 flex flex-col gap-4 animate-fade-in">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{TIPO_LABEL[m.tipo]}</div>
                    <h3 className="font-serif text-xl tracking-tight truncate">{m.nome}</h3>
                  </div>
                  {m.concluida && (
                    <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded bg-sage/15 text-sage">
                      Concluída
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <CircularProgress value={m.percentualConcluido} size={92} tone={m.concluida ? "sage" : "ink"} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-muted-foreground">Atual</div>
                    <div className="font-serif text-xl tabular-nums">{fmtBRL(m.valorAtual)}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">de {fmtBRL(m.valorAlvo)}</div>
                  </div>
                </div>

                {m.prazo && (
                  <div className="text-xs text-muted-foreground">
                    Prazo: {fmtDate(m.prazo)}
                    {days !== null && days >= 0 && ` · ${days} ${days === 1 ? "dia" : "dias"} restantes`}
                  </div>
                )}

                <div className="flex gap-2 mt-auto pt-2 border-t border-border">
                  <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => setContributeMeta(m)}>
                    <PlusCircle className="size-3.5" /> Contribuir
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleAdvice(m)} title="Conselho IA">
                    <Sparkles className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(m); setOpen(true); }} title="Editar">
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(m.id)} title="Excluir">
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <GoalDialog open={open} onOpenChange={setOpen} editing={editing} onSaved={() => { setOpen(false); fetchData(); }} />

      <ContributeDialog
        meta={contributeMeta}
        onClose={() => setContributeMeta(null)}
        onSaved={() => { setContributeMeta(null); fetchData(); }}
      />

      <Dialog open={!!adviceMeta} onOpenChange={(o) => !o && setAdviceMeta(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl tracking-tight">Conselhos para {adviceMeta?.nome}</DialogTitle>
            <DialogDescription>Análise gerada por IA com base nas suas finanças.</DialogDescription>
          </DialogHeader>
          <div className="text-sm whitespace-pre-line leading-relaxed">{advice || <Loading />}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const GoalDialog = ({ open, onOpenChange, editing, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; editing: Meta | null; onSaved: () => void }) => {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoMeta>("economizar");
  const [valorAlvo, setValorAlvo] = useState("");
  const [valorAtual, setValorAtual] = useState("");
  const [prazo, setPrazo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editing) {
      setNome(editing.nome); setTipo(editing.tipo);
      setValorAlvo(String(editing.valorAlvo)); setValorAtual(String(editing.valorAtual));
      setPrazo(editing.prazo ? editing.prazo.slice(0, 10) : "");
    } else {
      setNome(""); setTipo("economizar"); setValorAlvo(""); setValorAtual(""); setPrazo("");
    }
  }, [editing, open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body: any = {
        nome, tipo,
        valorAlvo: Number(valorAlvo),
        valorAtual: Number(valorAtual) || 0,
      };
      if (prazo) body.prazo = prazo;
      if (editing) await goalsApi.update(editing.id, body);
      else await goalsApi.create(body);
      toast.success(editing ? "Meta atualizada." : "Meta criada.");
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Não foi possível salvar.");
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-serif text-2xl tracking-tight">{editing ? "Editar meta" : "Nova meta"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5"><Label>Nome</Label><Input required value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <div className="flex flex-col gap-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoMeta)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TIPO_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5"><Label>Valor alvo (R$)</Label><Input type="number" step="0.01" required value={valorAlvo} onChange={(e) => setValorAlvo(e.target.value)} /></div>
            <div className="flex flex-col gap-1.5"><Label>Valor atual</Label><Input type="number" step="0.01" value={valorAtual} onChange={(e) => setValorAtual(e.target.value)} /></div>
          </div>
          <div className="flex flex-col gap-1.5"><Label>Prazo (opcional)</Label><Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} /></div>
          <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const ContributeDialog = ({ meta, onClose, onSaved }: { meta: Meta | null; onClose: () => void; onSaved: () => void }) => {
  const [valor, setValor] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => { setValor(""); }, [meta]);
  if (!meta) return null;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await goalsApi.contribute(meta.id, Number(valor));
      toast.success("Contribuição registrada.");
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Não foi possível registrar.");
    } finally { setLoading(false); }
  };
  return (
    <Dialog open={!!meta} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl tracking-tight">Contribuir — {meta.nome}</DialogTitle>
          <DialogDescription>Use valores negativos para retirar.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5"><Label>Valor (R$)</Label><Input type="number" step="0.01" required value={valor} onChange={(e) => setValor(e.target.value)} /></div>
          <Button type="submit" disabled={loading}>{loading ? "Registrando..." : "Confirmar"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default GoalsPage;
