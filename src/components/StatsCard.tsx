import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  variant?: "default" | "primary" | "success" | "warning";
}

const variantStyles = {
  default: "bg-card",
  primary: "bg-primary/5 border-primary/20",
  success: "bg-success/5 border-success/20",
  warning: "bg-warning/5 border-warning/20",
};

const iconStyles = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
};

function getFontSize(value: string | number): string {
  const len = String(value).length;
  if (len <= 6) return "text-2xl";
  if (len <= 9) return "text-lg";
  if (len <= 12) return "text-base";
  return "text-sm";
}

export default function StatsCard({ title, value, icon: Icon, description, variant = "default" }: StatsCardProps) {
  return (
    <Card className={`${variantStyles[variant]} animate-slide-in`}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-xl p-2.5 flex-shrink-0 ${iconStyles[variant]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground leading-tight">{title}</p>
          <p className={`${getFontSize(value)} font-bold font-heading text-foreground leading-tight break-all`}>{value}</p>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
