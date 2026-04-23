import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Loading, EmptyState } from "@/components/ui-kit/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, CircleCheck } from "lucide-react";
import { debtsApi, Divida } from "@/api/debts";
import { fmtBRL, fmtDate } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DebtsPage = () => {
  const [items, setItems] = useState<Divida[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Divida | null>(null);
  const [paying, setPaying] = useState<Divida | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await debtsApi.list();
      setItems(r.dividas);
      setTotal(r.totalDivida);
    } catch {
      toast.error("Erro ao carregar dívidas.");
    } finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta dívida?")) return;
    try { await debtsApi.remove(id); toast.success("Excluída."); fetchData(); }
    catch { toast.error("Não foi possível excluir."); }
  };

  return (
    <div className="p-12 max-w-6xl mx-auto flex flex-col gap-10 animate-fade-in">
      <PageHeader
        eyebrow="Compromissos"
        title="Dívidas"
        description="Mantenha visibilidade sobre o que você deve, registre pagamentos e quite uma a uma."
        action={<Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2"><Plus className="size-4" /> Nova dívida</Button>}
      />

      <div className="bg-surface rounded-2xl border border-border shadow-card p-8">
        <div className="text-sm text-muted-foreground mb-2">Total em dívidas</div>
        <div className="font-serif text-5xl tabular-nums text-terra">{fmtBRL(total)}</div>
        <div className="text-xs text-muted-foreground mt-2">{items.filter((d) => !d.quitada).length} compromissos em aberto</div>
      </div>

      {loading ? <Loading /> : items.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-border shadow-card p-8">
          <EmptyState title="Nenhuma dívida registrada" description="Adicione um financiamento, empréstimo ou parcelamento para acompanhar." />
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((d) => (
            <div key={d.id} className={cn(
              "bg-surface rounded-2xl border border-border shadow-card p-6 flex flex-col gap-4 animate-fade-in",
              d.quitada && "opacity-70"
            )}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Credor</div>
                  <h3 className={cn("font-serif text-xl tracking-tight truncate", d.quitada && "line-through text-sage")}>{d.credor}</h3>
                </div>
                {d.quitada && (
                  <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded bg-sage/15 text-sage flex items-center gap-1">
                    <CircleCheck className="size-3" /> Quitada
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-sm text-muted-foreground">Pago</span>
                  <span className="text-xs tabular-nums text-muted-foreground">{d.percentualPago.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-foreground rounded-full transition-all" style={{ width: `${Math.min(100, d.percentualPago)}%` }} />
                </div>
                <div className="flex justify-between mt-2 text-sm tabular-nums">
                  <span>{fmtBRL(d.valorPago)}</span>
                  <span className="text-muted-foreground">/ {fmtBRL(d.valorTotal)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div>
                  <div className="uppercase tracking-widest mb-0.5">Pendente</div>
                  <div className="text-sm font-medium text-terra tabular-nums">{fmtBRL(d.valorPendente)}</div>
                </div>
                <div>
                  <div className="uppercase tracking-widest mb-0.5">Juros</div>
                  <div className="text-sm font-medium text-foreground tabular-nums">{(d.taxaJuros ?? 0).toFixed(2)}% a.m.</div>
                </div>
                {d.vencimento && (
                  <div className="col-span-2">
                    <div className="uppercase tracking-widest mb-0.5">Vencimento</div>
                    <div className="text-sm font-medium text-foreground">{fmtDate(d.vencimento)}</div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-auto pt-2 border-t border-border">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setPaying(d)} disabled={d.quitada}>
                  Pagar parcela
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(d); setOpen(true); }} title="Editar">
                  <Pencil className="size-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(d.id)} title="Excluir">
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
        </section>
      )}

      <DebtDialog open={open} onOpenChange={setOpen} editing={editing} onSaved={() => { setOpen(false); fetchData(); }} />
      <PayDialog divida={paying} onClose={() => setPaying(null)} onSaved={() => { setPaying(null); fetchData(); }} />
    </div>
  );
};

const DebtDialog = ({ open, onOpenChange, editing, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; editing: Divida | null; onSaved: () => void }) => {
  const [credor, setCredor] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [valorPago, setValorPago] = useState("");
  const [taxaJuros, setTaxaJuros] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editing) {
      setCredor(editing.credor);
      setValorTotal(String(editing.valorTotal));
      setValorPago(String(editing.valorPago));
      setTaxaJuros(String(editing.taxaJuros ?? ""));
      setVencimento(editing.vencimento ? editing.vencimento.slice(0, 10) : "");
    } else {
      setCredor(""); setValorTotal(""); setValorPago(""); setTaxaJuros(""); setVencimento("");
    }
  }, [editing, open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body: any = {
        credor,
        valorTotal: Number(valorTotal),
        valorPago: Number(valorPago) || 0,
      };
      if (taxaJuros) body.taxaJuros = Number(taxaJuros);
      if (vencimento) body.vencimento = vencimento;
      if (editing) await debtsApi.update(editing.id, body);
      else await debtsApi.create(body);
      toast.success(editing ? "Atualizada." : "Criada.");
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Não foi possível salvar.");
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-serif text-2xl tracking-tight">{editing ? "Editar dívida" : "Nova dívida"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5"><Label>Credor</Label><Input required value={credor} onChange={(e) => setCredor(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5"><Label>Valor total</Label><Input type="number" step="0.01" required value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} /></div>
            <div className="flex flex-col gap-1.5"><Label>Valor pago</Label><Input type="number" step="0.01" value={valorPago} onChange={(e) => setValorPago(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5"><Label>Juros (% a.m.)</Label><Input type="number" step="0.01" value={taxaJuros} onChange={(e) => setTaxaJuros(e.target.value)} /></div>
            <div className="flex flex-col gap-1.5"><Label>Vencimento</Label><Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} /></div>
          </div>
          <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const PayDialog = ({ divida, onClose, onSaved }: { divida: Divida | null; onClose: () => void; onSaved: () => void }) => {
  const [valor, setValor] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => { setValor(""); }, [divida]);
  if (!divida) return null;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await debtsApi.pay(divida.id, Number(valor));
      toast.success("Pagamento registrado.");
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Não foi possível registrar.");
    } finally { setLoading(false); }
  };
  return (
    <Dialog open={!!divida} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl tracking-tight">Pagar — {divida.credor}</DialogTitle>
          <DialogDescription>Pendente: {fmtBRL(divida.valorPendente)}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5"><Label>Valor pago (R$)</Label><Input type="number" step="0.01" required value={valor} onChange={(e) => setValor(e.target.value)} /></div>
          <Button type="submit" disabled={loading}>{loading ? "Registrando..." : "Confirmar"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DebtsPage;
