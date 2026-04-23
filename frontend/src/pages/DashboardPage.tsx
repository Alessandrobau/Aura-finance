import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { SectionCard } from "@/components/ui-kit/SectionCard";
import { SummaryCard } from "@/components/ui-kit/SummaryCard";
import { Loading } from "@/components/ui-kit/States";
import { CategoryPieChart } from "@/components/Charts/CategoryPieChart";
import { AnnualLineChart } from "@/components/Charts/AnnualLineChart";
import { transactionsApi, SummaryResponse, AnnualResponse } from "@/api/transactions";
import { investmentsApi, PortfolioResponse } from "@/api/investments";
import { debtsApi, DebtsResponse } from "@/api/debts";
import { aiApi } from "@/api/ai";
import { useAuth } from "@/context/AuthContext";
import { fmtBRL, fmtDate, monthName } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const DashboardPage = () => {
  const { user } = useAuth();
  const now = new Date();
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [annual, setAnnual] = useState<AnnualResponse | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [debts, setDebts] = useState<DebtsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [insightOpen, setInsightOpen] = useState(false);
  const [insight, setInsight] = useState<string>("");
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      transactionsApi.summary(now.getMonth() + 1, now.getFullYear()),
      transactionsApi.annual(now.getFullYear()),
      investmentsApi.list(),
      debtsApi.list(),
    ])
      .then(([s, a, p, d]) => {
        if (s.status === "fulfilled") setSummary(s.value);
        if (a.status === "fulfilled") setAnnual(a.value);
        if (p.status === "fulfilled") setPortfolio(p.value);
        if (d.status === "fulfilled") setDebts(d.value);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInsight = async () => {
    setInsightOpen(true);
    setInsightLoading(true);
    try {
      const { insight } = await aiApi.weeklySummary();
      setInsight(insight);
    } catch {
      setInsight("Não foi possível gerar o resumo agora.");
    } finally {
      setInsightLoading(false);
    }
  };

  const categoryData = summary
    ? Object.entries(summary.porCategoria)
        .filter(([, v]) => v.tipo === "despesa")
        .map(([name, v]) => ({ name, value: v.total }))
        .sort((a, b) => b.value - a.value)
    : [];

  if (loading) {
    return (
      <div className="p-12">
        <Loading />
      </div>
    );
  }

  const greetingName = user?.nome?.split(" ")[0] ?? "";

  return (
    <div className="p-12 max-w-6xl mx-auto flex flex-col gap-10 animate-fade-in">
      <PageHeader
        eyebrow={fmtDate(now)}
        title={`Olá, ${greetingName}.`}
        description={`Resumo de ${monthName(now.getMonth())} de ${now.getFullYear()}. Acompanhe seu fluxo, metas e compromissos em um só lugar.`}
        action={
          <Button onClick={handleInsight} variant="outline" className="gap-2">
            <Sparkles className="size-4" /> Resumo da semana
          </Button>
        }
      />

      {/* Summary cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard
          label="Total Receitas"
          value={fmtBRL(summary?.receitas ?? 0)}
          tone="positive"
          hint="Entradas no mês"
        />
        <SummaryCard
          label="Total Despesas"
          value={fmtBRL(summary?.despesas ?? 0)}
          tone="negative"
          hint="Saídas no mês"
        />
        <SummaryCard
          label="Saldo"
          value={fmtBRL(summary?.saldo ?? 0)}
          tone={(summary?.saldo ?? 0) < 0 ? "negative" : "neutral"}
          hint="Receitas − Despesas"
        />
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
        <SectionCard title="Fluxo Anual" action={
          <div className="flex gap-4 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="size-2 bg-sage rounded-full" /> Receitas</span>
            <span className="flex items-center gap-1.5"><span className="size-2 bg-terra rounded-full" /> Despesas</span>
          </div>
        }>
          {annual ? <AnnualLineChart data={annual.meses} /> : <Loading />}
        </SectionCard>

        <SectionCard title="Distribuição Mensal">
          <CategoryPieChart data={categoryData} />
        </SectionCard>
      </section>

      {/* Widgets */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
        <Link to="/investments" className="group">
          <div className="bg-surface rounded-2xl border border-border shadow-card p-8 h-full transition-all group-hover:shadow-soft group-hover:border-sand">
            <div className="flex items-center gap-3 mb-6">
              <div className="size-10 rounded-xl bg-muted flex items-center justify-center">
                <TrendingUp className="size-5 text-foreground" strokeWidth={1.75} />
              </div>
              <h2 className="text-lg font-serif tracking-tight">Patrimônio investido</h2>
              <ArrowRight className="size-4 text-muted-foreground ml-auto transition-transform group-hover:translate-x-1" />
            </div>
            <div className="font-serif text-4xl tabular-nums">{fmtBRL(portfolio?.patrimonioTotal ?? 0)}</div>
            <p className="text-sm text-muted-foreground mt-2">
              {portfolio?.investimentos.length ?? 0} {(portfolio?.investimentos.length ?? 0) === 1 ? "ativo" : "ativos"} no portfólio
            </p>
          </div>
        </Link>

        <Link to="/debts" className="group">
          <div className="bg-surface rounded-2xl border border-border shadow-card p-8 h-full transition-all group-hover:shadow-soft group-hover:border-sand">
            <div className="flex items-center gap-3 mb-6">
              <div className="size-10 rounded-xl bg-muted flex items-center justify-center">
                <Wallet className="size-5 text-foreground" strokeWidth={1.75} />
              </div>
              <h2 className="text-lg font-serif tracking-tight">Total em dívidas</h2>
              <ArrowRight className="size-4 text-muted-foreground ml-auto transition-transform group-hover:translate-x-1" />
            </div>
            <div className="font-serif text-4xl tabular-nums text-terra">{fmtBRL(debts?.totalDivida ?? 0)}</div>
            <p className="text-sm text-muted-foreground mt-2">
              {debts?.dividas.filter((d) => !d.quitada).length ?? 0} compromissos em aberto
            </p>
          </div>
        </Link>
      </section>

      <Dialog open={insightOpen} onOpenChange={setInsightOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl tracking-tight">Resumo da semana</DialogTitle>
            <DialogDescription>Análise gerada pelo assistente IA.</DialogDescription>
          </DialogHeader>
          <div className="text-sm text-foreground whitespace-pre-line leading-relaxed">
            {insightLoading ? <Loading /> : insight}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardPage;
