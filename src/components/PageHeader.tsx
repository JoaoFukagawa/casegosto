import type { ReactNode } from "react";

export default function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h2 className="text-[26px] font-bold font-heading text-[var(--color-text-primary)]">{title}</h2>
        {subtitle && <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
