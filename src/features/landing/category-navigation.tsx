import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

export function CategoryNavigation({
  children,
  label,
  allLabel,
}: {
  children: ReactNode;
  label: string;
  allLabel: string;
}) {
  return (
    <nav className="premium-category-bar premium-container" aria-label={label}>
      <div className="premium-category-track">{children}</div>
      <div className="premium-category-footer">
        <Link href="/products" className="premium-link">
          {allLabel}
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </nav>
  );
}
