import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { SectionCard } from "@/components/ui-kit/SectionCard";
import { Loading, EmptyState } from "@/components/ui-kit/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { investmentsApi, Investimento, TipoInvestimento, PortfolioResponse } from "@/api/investments";
import { fmtBRL, fmtNumber } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const TIPO_LABEL: Record<TipoInvestimento, string> = {
  acao: "Ações",
  cripto: "Cripto",
  renda_fixa: "Renda Fixa",
  fii: "Fundos Imobiliários",
};

const COLORS = [
  "hsl(var(--chart-sage))",
  "hsl(var(--chart-ink))",
  "hsl(var(--chart-sand))",
  "hsl(var(--chart-terra))",
];

const InvestmentsPage = () => {
  const [data, setData] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      setData(await investmentsApi.list());
    } catch {
      toast.error("Erro ao carregar portfólio.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este investimento?")) return;
    try {
      await investmentsApi.remove(id);
      toast.success("Removido.");
      fetchData();
    } catch {
      toast.error("Não foi possível remover.");
    }
  };

  const byType = data
    ? Object.entries(
        data.investimentos.reduce<Record<string, number>>((acc, inv) => {
          acc[inv.tipo] = (acc[inv.tipo] || 0) + inv.valorAtual;
          return acc;
        }, {})
      ).map(([tipo, value]) => ({ name: TIPO_LABEL[tipo as TipoInvestimento] ?? tipo, value }))
    : [];

  return (
    <div className="p-12 max-w-6xl mx-auto flex flex-col gap-10 animate-fade-in">
      <PageHeader
        eyebrow="Portfólio"
        title="Investimentos"
        description="Acompanhe a evolução do seu patrimônio e a performance de cada ativo."
        action={
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="size-4" /> Adicionar
          </Button>
        }
      />

      {loading ? (
        <Loading />
      ) : (
        <>
          <section className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
            <div className="bg-surface rounded-2xl border border-border shadow-card p-8">
              <div className="text-sm text-muted-foreground mb-2">Patrimônio total</div>
              <div className="font-serif text-5xl tabular-nums">{fmtBRL(data?.patrimonioTotal ?? 0)}</div>
              <div className="text-xs text-muted-foreground mt-2">
                {data?.investimentos.length ?? 0} ativos no portfólio
              </div>
            </div>

            <SectionCard title="Por tipo">
              {byType.length ? (
                <div className="flex items-center gap-6">
                  <div className="size-32 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={byType} dataKey="value" innerRadius={40} outerRadius={62} paddingAngle={1} stroke="none">
                          {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", fontSize: "0.8rem" }}
                          formatter={(v: number) => fmtBRL(v)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="flex flex-col gap-2 text-sm w-full min-w-0">
                    {byType.map((d, i) => (
                      <li key={d.name} className="flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="truncate">{d.name}</span>
                        <span className="ml-auto tabular-nums text-muted-foreground">{fmtBRL(d.value)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : <div className="text-sm text-muted-foreground">Sem ativos ainda.</div>}
            </SectionCard>
          </section>

          <SectionCard title="Ativos">
            {!data?.investimentos.length ? (
              <EmptyState title="Nenhum investimento" description="Adicione seu primeiro ativo para começar a acompanhar." />
            ) : (
              <div className="overflow-x-auto -mx-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-widest text-muted-foreground border-b border-border">
                      <th className="text-left font-medium px-4 py-3">Ticker</th>
                      <th className="text-left font-medium px-4 py-3">Tipo</th>
                      <th className="text-right font-medium px-4 py-3">Qtd</th>
                      <th className="text-right font-medium px-4 py-3">P. médio</th>
                      <th className="text-right font-medium px-4 py-3">P. atual</th>
                      <th className="text-right font-medium px-4 py-3">Valor</th>
                      <th className="text-right font-medium px-4 py-3">Lucro</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.investimentos.map((inv) => (
                      <tr key={inv.id} className="border-b border-border last:border-0 group">
                        <td className="px-4 py-4">
                          <div className="font-medium">{inv.ticker}</div>
                          {inv.cotacao?.nome && <div className="text-xs text-muted-foreground truncate max-w-32">{inv.cotacao.nome}</div>}
                        </td>
                        <td className="px-4 py-4 text-muted-foreground capitalize">{TIPO_LABEL[inv.tipo]}</td>
                        <td className="px-4 py-4 text-right tabular-nums">{fmtNumber(inv.quantidade, { maximumFractionDigits: 8 })}</td>
                        <td className="px-4 py-4 text-right tabular-nums text-muted-foreground">{fmtBRL(inv.precoMedio)}</td>
                        <td className="px-4 py-4 text-right tabular-nums">{fmtBRL(inv.precoAtual)}</td>
                        <td className="px-4 py-4 text-right tabular-nums font-medium">{fmtBRL(inv.valorAtual)}</td>
                        <td className={cn("px-4 py-4 text-right tabular-nums font-medium", inv.lucroPrejuizo >= 0 ? "text-sage" : "text-terra")}>
                          {fmtBRL(inv.lucroPrejuizo)}
                          <div className="text-xs">{inv.lucroPrejuizoPercent >= 0 ? "+" : ""}{inv.lucroPrejuizoPercent.toFixed(2)}%</div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button onClick={() => handleDelete(inv.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-terra transition">
                            <Trash2 className="size-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </>
      )}

      <InvestmentDialog open={open} onOpenChange={setOpen} onSaved={() => { setOpen(false); fetchData(); }} />
    </div>
  );
};

const InvestmentDialog = ({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) => {
  const [tipo, setTipo] = useState<TipoInvestimento>("acao");
  const [ticker, setTicker] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [precoMedio, setPrecoMedio] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setTipo("acao"); setTicker(""); setQuantidade(""); setPrecoMedio("");
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await investmentsApi.create({
        tipo,
        ticker: ticker.toUpperCase(),
        quantidade: Number(quantidade),
        precoMedio: Number(precoMedio),
      });
      toast.success("Investimento adicionado.");
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Não foi possível adicionar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-serif text-2xl tracking-tight">Novo investimento</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoInvestimento)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="acao">Ação</SelectItem>
                <SelectItem value="cripto">Cripto</SelectItem>
                <SelectItem value="renda_fixa">Renda Fixa</SelectItem>
                <SelectItem value="fii">FII</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Ticker</Label>
            <Input required value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder="PETR4, BTC, HGLG11..." />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Quantidade</Label>
            <Input type="number" step="any" required value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Preço médio (R$)</Label>
            <Input type="number" step="0.01" required value={precoMedio} onChange={(e) => setPrecoMedio(e.target.value)} />
          </div>
          <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Adicionar"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InvestmentsPage;
