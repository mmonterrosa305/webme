import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-8">
      <p className="text-sm font-medium text-neutral-500">{eyebrow}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
        {title}
      </h1>
      <p className="mt-2 text-sm text-neutral-600">{description}</p>
    </header>
  );
}

export function StatCard({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: string;
}) {
  return (
    <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-300">
      <p className="text-sm font-medium text-neutral-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
        {value}
      </p>
      <p className="mt-2 text-xs text-neutral-600">{change}</p>
    </article>
  );
}

export function Panel({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm ${className}`}
    >
      <div className="border-b border-neutral-200 px-5 py-4">
        <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-xs uppercase tracking-wider text-neutral-500">
            {columns.map((col) => (
              <th key={col} className="px-5 py-3 font-medium">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((cells, i) => (
            <tr key={i} className="transition hover:bg-neutral-50">
              {cells.map((cell, j) => (
                <td key={j} className="px-5 py-3.5 text-neutral-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatusPill({
  label,
  variant = "default",
}: {
  label: string;
  variant?: "default" | "success" | "warning" | "accent";
}) {
  const styles = {
    default: "bg-neutral-100 text-neutral-700 border-neutral-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    accent: "bg-neutral-900 text-white border-neutral-900",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[variant]}`}
    >
      {label}
    </span>
  );
}

export function PriorityBadge({
  priority,
}: {
  priority: "high" | "medium" | "low";
}) {
  const styles = {
    high: "bg-neutral-900 text-white border-neutral-900",
    medium: "bg-neutral-200 text-neutral-800 border-neutral-300",
    low: "bg-neutral-100 text-neutral-600 border-neutral-200",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${styles[priority]}`}
    >
      {priority}
    </span>
  );
}
