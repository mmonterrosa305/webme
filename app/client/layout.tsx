import type { ReactNode } from "react";

export default function ClientLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="h-dvh w-full overflow-hidden font-sans text-neutral-900">
      {children}
    </div>
  );
}
