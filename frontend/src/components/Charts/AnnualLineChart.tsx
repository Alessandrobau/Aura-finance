import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { monthShort, fmtBRL } from "@/lib/format";
import type { AnnualResponse } from "@/api/transactions";

export const AnnualLineChart = ({ data }: { data: AnnualResponse["meses"] }) => {
  const chartData = data.map((m) => ({
    mes: monthShort(m.mes - 1),
    Receitas: m.receitas,
    Despesas: m.despesas,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--surface))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.75rem",
              fontSize: "0.8rem",
            }}
            formatter={(value: number) => fmtBRL(value)}
          />
          <Legend wrapperStyle={{ fontSize: "0.8rem" }} iconType="circle" />
          <Line
            type="monotone"
            dataKey="Receitas"
            stroke="hsl(var(--sage))"
            strokeWidth={2}
            dot={{ r: 3, fill: "hsl(var(--sage))" }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="Despesas"
            stroke="hsl(var(--terra))"
            strokeWidth={2}
            dot={{ r: 3, fill: "hsl(var(--terra))" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
