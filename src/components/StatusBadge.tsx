import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-warning/15 text-warning border-warning/30 hover:bg-warning/20" },
  preparando: { label: "Preparando", className: "bg-info/15 text-info border-info/30 hover:bg-info/20" },
  pronto: { label: "Pronto", className: "bg-primary/15 text-primary border-primary/30 hover:bg-primary/20" },
  entregue: { label: "Entregue", className: "bg-success/15 text-success border-success/30 hover:bg-success/20" },
  cancelado: { label: "Cancelado", className: "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20" },
};

export default function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.pendente;
  return (
    <Badge variant="outline" className={`font-medium ${config.className}`}>
      {config.label}
    </Badge>
  );
}
