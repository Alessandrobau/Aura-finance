import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { SectionCard } from "@/components/ui-kit/SectionCard";
import { Loading, EmptyState } from "@/components/ui-kit/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Sparkles, Pencil, Trash2 } from "lucide-react";
import { transactionsApi, Transacao, TipoTransacao } from "@/api/transactions";
import { aiApi } from "@/api/ai";
import { fmtBRL, fmtDate } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TransactionsPage = () => {
  const now = new Date();
  const [items, setItems] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [tipo, setTipo] = useState<"" | TipoTransacao>("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transacao | null>(null);
  const [anomaliesOpen, setAnomaliesOpen] = useState(false);
  const [anomalies, setAnomalies] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await transactionsApi.list({
        mes,
        ano,
        tipo: tipo || undefined,
        limit: 50,
      });
      setItems(res.data);
    } catch (err: any) {
      toast.error("Erro ao carregar transações.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, ano, tipo]);

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta transação?")) return;
    try {
      await transactionsApi.remove(id);
      toast.success("Transação excluída.");
      fetchData();
    } catch {
      toast.error("Não foi possível excluir.");
    }
  };

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (t: Transacao) => {
    setEditing(t);
    setOpen(true);
  };

  const handleAnomalies = async () => {
    setAnomaliesOpen(true);
    try {
      const r = await aiApi.anomalies();
      setAnomalies(r.insight);
    } catch {
      setAnomalies("Não foi possível analisar agora.");
    }
  };

  return (
    <div className="p-12 max-w-6xl mx-auto flex flex-col gap-10 animate-fade-in">
      <PageHeader
        eyebrow="Movimentação"
        title="Transações"
        description="Suas receitas e despesas registradas. Filtre, edite e mantenha tudo em ordem."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleAnomalies} className="gap-2">
              <Sparkles className="size-4" /> Anomalias
            </Button>
            <Button onClick={openNew} className="gap-2">
              <Plus className="size-4" /> Nova
            </Button>
          </div>
        }
      />

      <SectionCard>
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex flex-col gap-1.5 min-w-32">
            <Label className="text-xs text-muted-foreground">Mês</Label>
            <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    {new Date(2024, i).toLocaleString("pt-BR", { month: "long" })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-28">
            <Label className="text-xs text-muted-foreground">Ano</Label>
            <Input type="number" value={ano} onChange={(e) => setAno(Number(e.target.value))} />
          </div>
          <div className="flex flex-col gap-1.5 min-w-36">
            <Label className="text-xs text-muted-foreground">Tipo</Label>
            <Select value={tipo || "all"} onValueChange={(v) => setTipo(v === "all" ? "" : (v as TipoTransacao))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="receita">Receitas</SelectItem>
                <SelectItem value="despesa">Despesas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <Loading />
        ) : items.length === 0 ? (
          <EmptyState title="Nenhuma transação no período" description="Adicione sua primeira movimentação para começar." />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((t) => (
              <li key={t.id} className="py-4 flex items-center gap-4 group">
                <div className={cn(
                  "size-2.5 rounded-full shrink-0",
                  t.tipo === "receita" ? "bg-sage" : "bg-terra"
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{t.descricao || t.categoria}</span>
                    {t.criadoPorIa && (
                      <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        IA
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {t.categoria} · {fmtDate(t.data)}
                  </div>
                </div>
                <div className={cn(
                  "font-serif text-lg tabular-nums",
                  t.tipo === "receita" ? "text-sage" : "text-terra"
                )}>
                  {t.tipo === "receita" ? "+" : "−"} {fmtBRL(t.valor)}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(t)} className="p-1.5 text-muted-foreground hover:text-foreground" aria-label="Editar">
                    <Pencil className="size-4" />
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="p-1.5 text-muted-foreground hover:text-terra" aria-label="Excluir">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <TransactionDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSaved={() => {
          setOpen(false);
          fetchData();
        }}
      />

      <Dialog open={anomaliesOpen} onOpenChange={setAnomaliesOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl tracking-tight">Anomalias detectadas</DialogTitle>
          </DialogHeader>
          <div className="text-sm whitespace-pre-line leading-relaxed">
            {anomalies || <Loading />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface TxDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Transacao | null;
  onSaved: () => void;
}
const TransactionDialog = ({ open, onOpenChange, editing, onSaved }: TxDialogProps) => {
  const [tipo, setTipo] = useState<TipoTransacao>("despesa");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState<string>(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (editing) {
      setTipo(editing.tipo);
      setValor(String(editing.valor));
      setCategoria(editing.categoria);
      setDescricao(editing.descricao ?? "");
      setData(editing.data.slice(0, 10));
    } else {
      setTipo("despesa");
      setValor("");
      setCategoria("");
      setDescricao("");
      setData(new Date().toISOString().slice(0, 10));
    }
  }, [editing, open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body = {
        tipo,
        valor: Number(valor) as any,
        categoria,
        descricao,
        data: new Date(data).toISOString(),
      };
      if (editing) {
        await transactionsApi.update(editing.id, body as any);
        toast.success("Transação atualizada.");
      } else {
        await transactionsApi.create(body as any);
        toast.success("Transação criada.");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Não foi possível salvar.");
    } finally {
      setLoading(false);
    }
  };

  const autoCategorize = async () => {
    if (!descricao) return;
    setAiLoading(true);
    try {
      const r = await aiApi.categorize(descricao);
      setCategoria(r.categoria);
    } catch {
      // silent
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl tracking-tight">
            {editing ? "Editar transação" : "Nova transação"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoTransacao)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="receita">Receita</SelectItem>
                <SelectItem value="despesa">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Valor (R$)</Label>
            <Input type="number" step="0.01" required value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Descrição</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} onBlur={autoCategorize} placeholder="Ex.: Almoço com cliente" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="flex items-center gap-2">
              Categoria
              {aiLoading && <Sparkles className="size-3 animate-pulse text-muted-foreground" />}
            </Label>
            <Input required value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="alimentação, transporte..." />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Data</Label>
            <Input type="date" required value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionsPage;
