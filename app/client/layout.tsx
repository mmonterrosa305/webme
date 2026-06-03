import type { ReactNode } from "react";

export default function ClientLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="min-h-full bg-white font-sans text-neutral-900">{children}</div>
  );
}
