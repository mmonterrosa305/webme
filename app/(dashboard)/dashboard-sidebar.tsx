"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Overview", href: "/overview" },
  { label: "Pipeline", href: "/pipeline" },
  { label: "Create Site", href: "/agents" },
  { label: "Projects", href: "/projects" },
  { label: "Search Leads", href: "/leads" },
  { label: "Import Site", href: "/import-site" },
  { label: "Business Search", href: "/business-search" },
  { label: "Video Library", href: "/video-library" },
  { label: "Outreach Queue", href: "/outreach-queue" },
  { label: "Outreach", href: "/outreach" },
  { label: "Clients", href: "/clients" },
  { label: "Revenue", href: "/revenue" },
] as const;

function WebMeLogo({ className }: { className: string }) {
  return (
    <Link
      href="/overview"
      className={`block px-2 text-xl lowercase tracking-[0.12em] !text-white ${className}`}
    >
      webme io
    </Link>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebar({
  userEmail,
  brandClassName,
}: {
  userEmail: string | null;
  brandClassName: string;
}) {
  const pathname = usePathname();

  return (
    <aside
      className="flex w-64 shrink-0 flex-col border-r border-neutral-800 bg-[#111111] text-white"
      style={{ backgroundColor: "#111111" }}
    >
      <div className="border-b border-neutral-800 px-4 py-5">
        <WebMeLogo className={brandClassName} />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Dashboard">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2.5 text-sm font-medium text-white transition ${
                active
                  ? "bg-neutral-800"
                  : "hover:bg-neutral-800"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-neutral-800 px-4 py-4">
        <p className="truncate text-xs text-neutral-400">Signed in as</p>
        <p
          className="mt-0.5 truncate text-sm font-medium text-white"
          title={userEmail ?? undefined}
        >
          {userEmail ?? "—"}
        </p>
      </div>
    </aside>
  );
}
