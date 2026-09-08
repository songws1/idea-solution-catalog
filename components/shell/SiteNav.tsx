"use client";

import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Catalog" },
  { href: "/governance", label: "Governance" },
  { href: "/export", label: "Export" },
] as const;

/**
 * Header navigation with an active state. Split out of layout.tsx because the
 * active link needs the current path, which only a client component can read.
 */
export function SiteNav(): React.JSX.Element {
  const pathname = usePathname();

  return (
    <nav className="site-nav">
      {LINKS.map((link) => {
        const active =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <a
            key={link.href}
            href={link.href}
            className={active ? "active" : undefined}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </a>
        );
      })}
    </nav>
  );
}
