import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
export function PhasePanel({
  title,
  description,
  href,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  href?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`phase-panel ${className}`}>
      <header>
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {href && (
          <Link href={href}>
            View all <ArrowUpRight size={13} />
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}
export function SummaryTile({
  label,
  value,
  detail,
  icon: Icon,
  tone = "blue",
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: string;
}) {
  return (
    <article className={`phase-summary tone-${tone}`}>
      <span>
        {label}
        <Icon size={18} />
      </span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
