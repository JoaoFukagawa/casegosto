export default function EmptyState({ message }: { message?: string }) {
  return (
    <p className="text-center text-muted-foreground py-8">{message || "Nenhum registro encontrado."}</p>
  );
}
