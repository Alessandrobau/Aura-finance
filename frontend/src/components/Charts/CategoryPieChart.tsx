import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { fmtBRL } from "@/lib/format";

interface CategoryDatum {
  name: string;
  value: number;
}

const COLORS = [
  "hsl(var(--chart-sage))",
  "hsl(var(--chart-ink))",
  "hsl(var(--chart-sand))",
  "hsl(var(--chart-terra))",
  "hsl(var(--chart-muted))",
];

export const CategoryPieChart = ({ data }: { data: CategoryDatum[] }) => {
  if (!data.length) {
    return (
      <div className="text-sm text-muted-foreground text-center py-12">
        Sem despesas registradas neste período.
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex items-center gap-8">
      <div className="size-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={1}
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "hsl(var(--surface))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.75rem",
                fontSize: "0.8rem",
              }}
              formatter={(value: number) => fmtBRL(value)}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex flex-col gap-3 w-full min-w-0">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-3 text-sm">
            <span
              className="size-2.5 rounded-full shrink-0"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="capitalize truncate">{d.name}</span>
            <span className="ml-auto tabular-nums text-muted-foreground">
              {((d.value / total) * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
