import Link from "next/link";
import type { ReactNode } from "react";

export default function ClientLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden font-sans text-neutral-900">
      <header className="shrink-0 border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="text-[20px] font-medium text-neutral-900"
        >
          mywebme
        </Link>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
