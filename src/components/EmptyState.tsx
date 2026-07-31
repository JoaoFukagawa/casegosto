export default function EmptyState({ message }: { message?: string }) {
  return (
    <p className="text-center text-[var(--color-text-secondary)] py-8">
      {message || "Nenhum registro encontrado."}
    </p>
  );
}
