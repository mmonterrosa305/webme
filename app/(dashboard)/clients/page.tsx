import type { Metadata } from "next";

import { PageHeader } from "../_components/dashboard-ui";
import { getClients } from "@/lib/clients/get-clients";

import { ClientsTable } from "./clients-table";

export const metadata: Metadata = {
  title: "Clients — WebMe",
};

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        eyebrow="Accounts"
        title="Clients"
        description="Paying customers synced from Stripe checkout into Supabase."
      />
      <ClientsTable clients={clients} />
    </main>
  );
}
