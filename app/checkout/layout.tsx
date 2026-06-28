import Link from "next/link";
import type { ReactNode } from "react";

export default function CheckoutLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="min-h-dvh bg-neutral-50 font-sans text-neutral-900">
      <header className="border-b border-neutral-200 bg-white px-4 py-4 sm:px-6">
        <Link href="/" className="text-xl font-semibold tracking-tight text-neutral-900">
          mywebme
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-col px-4 py-10 sm:px-6 sm:py-14">
        {children}
      </main>
    </div>
  );
}
