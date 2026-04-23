export const fmtBRL = (value: number | string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0);

export const fmtNumber = (value: number | string, opts?: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2, ...opts }).format(Number(value) || 0);

export const fmtDate = (iso: string | Date) => {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("pt-BR").format(d);
};

export const monthName = (monthIndex: number, year = new Date().getFullYear()) =>
  new Date(year, monthIndex).toLocaleString("pt-BR", { month: "long" });

export const monthShort = (monthIndex: number) =>
  new Date(2024, monthIndex).toLocaleString("pt-BR", { month: "short" }).replace(".", "");

export const daysUntil = (iso?: string | null) => {
  if (!iso) return null;
  const target = new Date(iso).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
};
