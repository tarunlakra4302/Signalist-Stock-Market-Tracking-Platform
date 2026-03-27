"use client";

import { motion } from "framer-motion";

interface MatrixCellProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
}

export const MatrixCell = ({ label, value, subValue, trend }: MatrixCellProps) => {
  const trendColor = trend === "up" ? "text-success" : trend === "down" ? "text-accent" : "text-muted-foreground";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="data-cell border-b border-r border-border/10 last:border-0"
    >
      <span className="text-[10px] font-mono font-bold tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-black tabular-nums tracking-tighter">
          {value}
        </span>
        {subValue && (
          <span className={`text-xs font-bold ${trendColor}`}>
            {subValue}
          </span>
        )}
      </div>
    </motion.div>
  );
};
