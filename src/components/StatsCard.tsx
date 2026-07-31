import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  variant?: "default" | "primary" | "success" | "warning";
  highlight?: boolean;
}

function getFontSize(value: string | number): string {
  const len = String(value).length;
  if (len <= 5) return "text-[26px]";
  if (len <= 7) return "text-xl";
  if (len <= 9) return "text-base";
  if (len <= 12) return "text-sm";
  return "text-xs";
}

export default function StatsCard({ title, value, icon: Icon, description, variant = "default", highlight }: StatsCardProps) {
  const iconColor = {
    default: "text-[var(--color-accent)]",
    primary: "text-[var(--color-accent)]",
    success: "text-[var(--color-success)]",
    warning: "text-[var(--color-warning)]",
  }[variant];

  return (
    <Card
      className={`card-hover animate-slide-in rounded-2xl border border-[var(--color-border)] ${
        highlight
          ? "border-l-[3px] !border-l-[var(--color-warning)] bg-[var(--color-warning-bg)]"
          : "bg-[var(--color-surface)]"
      }`}
    >
      <CardContent className="flex items-start gap-4 p-6">
        <Icon className={`h-5 w-5 flex-shrink-0 mt-1 ${iconColor}`} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[1px] text-[var(--color-text-secondary)] leading-tight">
            {title}
          </p>
          <p className={`${getFontSize(value)} font-bold font-heading text-[var(--color-text-primary)] leading-tight whitespace-nowrap truncate mt-1`}>
            {value}
          </p>
          {description && <p className="text-xs text-[var(--color-text-secondary)] mt-1">{description}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
