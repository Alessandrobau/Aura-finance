interface CircularProgressProps {
  value: number; // 0-100
  size?: number;
  label?: string;
  tone?: "sage" | "terra" | "ink";
}

const toneToVar = {
  sage: "hsl(var(--sage))",
  terra: "hsl(var(--terra))",
  ink: "hsl(var(--foreground))",
};

export const CircularProgress = ({ value, size = 120, label, tone = "sage" }: CircularProgressProps) => {
  const v = Math.min(100, Math.max(0, value));
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (v / 100) * circ;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="hsl(var(--muted))" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={toneToVar[tone]}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-serif text-xl tabular-nums">{v.toFixed(0)}%</div>
        {label && <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">{label}</div>}
      </div>
    </div>
  );
};
