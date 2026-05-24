import { Raleway } from "next/font/google";
import type { ReactNode } from "react";

import { DashboardSidebar } from "./dashboard-sidebar";
import { createClient } from "@/lib/supabase/server";

const raleway = Raleway({
  weight: "300",
  subsets: ["latin"],
});

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-full flex-1">
      <DashboardSidebar
        userEmail={user?.email ?? null}
        brandClassName={raleway.className}
      />
      <div className="min-w-0 flex-1 bg-white font-sans text-neutral-900">
        {children}
      </div>
    </div>
  );
}
