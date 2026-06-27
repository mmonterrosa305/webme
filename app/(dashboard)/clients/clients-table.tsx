"use client";

import { useMemo, useState } from "react";

import {
  DataTable,
  Panel,
  StatCard,
  StatusPill,
} from "../_components/dashboard-ui";
import type { Client } from "@/lib/clients/types";

const PLAN_OPTIONS = ["all", "standard", "monthly", "starter", "premium"] as const;
const STATUS_OPTIONS = ["all", "active", "payment_failed"] as const;

type PlanFilter = (typeof PLAN_OPTIONS)[number];
type StatusFilter = (typeof STATUS_OPTIONS)[number];

function formatPlanLabel(plan: string): string {
  switch (plan) {
    case "standard":
      return "WebMe";
    case "monthly":
      return "Basic (legacy)";
    case "starter":
      return "Pro (legacy)";
    case "premium":
      return "Elite (legacy)";
    default:
      return plan;
  }
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function statusVariant(
  status: string,
): "default" | "success" | "warning" | "accent" {
  if (status === "active") {
    return "success";
  }

  if (status === "payment_failed") {
    return "warning";
  }

  return "default";
}

export function ClientsTable({ clients }: { clients: Client[] }) {
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();

    return clients.filter((client) => {
      const matchesSearch =
        !query ||
        client.business_name.toLowerCase().includes(query) ||
        client.owner_email.toLowerCase().includes(query) ||
        client.stripe_customer_id.toLowerCase().includes(query);

      const matchesPlan =
        planFilter === "all" || client.package === planFilter;

      const matchesStatus =
        statusFilter === "all" ||
        client.subscription_status === statusFilter;

      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [clients, planFilter, search, statusFilter]);

  const stats = useMemo(() => {
    const activeClients = clients.filter(
      (client) => client.subscription_status === "active",
    );
    const totalMrr = activeClients.reduce(
      (sum, client) => sum + Number(client.monthly_amount),
      0,
    );
    const failedPayments = clients.filter(
      (client) => client.subscription_status === "payment_failed",
    ).length;

    return {
      totalClients: clients.length,
      activeClients: activeClients.length,
      totalMrr,
      failedPayments,
    };
  }, [clients]);

  const rows = filteredClients.map((client) => [
    <span key="business" className="font-medium text-neutral-900">
      {client.business_name}
    </span>,
    <span key="plan" className="text-neutral-700">
      {formatPlanLabel(client.package)}
    </span>,
    <StatusPill
      key="status"
      label={client.subscription_status.replace("_", " ")}
      variant={statusVariant(client.subscription_status)}
    />,
    <span key="email" className="text-neutral-600">
      {client.owner_email}
    </span>,
    <span key="created" className="text-neutral-500">
      {formatDate(client.created_at)}
    </span>,
    <span key="customer" className="font-mono text-xs text-neutral-500">
      {client.stripe_customer_id}
    </span>,
    <span key="mrr" className="font-medium text-neutral-900">
      {formatCurrency(Number(client.monthly_amount))}/mo
    </span>,
  ]);

  return (
    <div className="space-y-8">
      <section
        aria-label="Client metrics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label="Total clients"
          value={String(stats.totalClients)}
          change={`${stats.activeClients} active subscriptions`}
        />
        <StatCard
          label="Active clients"
          value={String(stats.activeClients)}
          change="From Supabase clients table"
        />
        <StatCard
          label="Total MRR"
          value={formatCurrency(stats.totalMrr)}
          change="Sum of active monthly amounts"
        />
        <StatCard
          label="Payment issues"
          value={String(stats.failedPayments)}
          change="Subscriptions marked payment_failed"
        />
      </section>

      <Panel title="Client roster" subtitle="Paying customers from Supabase">
        <div className="border-b border-neutral-200 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px_160px]">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by business, email, or Stripe customer ID"
              className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200"
            />
            <select
              value={planFilter}
              onChange={(event) =>
                setPlanFilter(event.target.value as PlanFilter)
              }
              className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200"
            >
              <option value="all">All plans</option>
              <option value="standard">WebMe</option>
              <option value="monthly">Basic (legacy)</option>
              <option value="starter">Pro (legacy)</option>
              <option value="premium">Elite (legacy)</option>
            </select>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="payment_failed">Payment failed</option>
            </select>
          </div>
        </div>

        {clients.length === 0 ? (
          <div className="px-5 py-10 text-sm text-neutral-500">
            No clients yet — your first paying customer will appear here.
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="px-5 py-10 text-sm text-neutral-500">
            No clients match your current search or filters.
          </div>
        ) : (
          <DataTable
            columns={[
              "Business",
              "Plan",
              "Status",
              "Email",
              "Created",
              "Stripe customer",
              "MRR",
            ]}
            rows={rows}
          />
        )}
      </Panel>
    </div>
  );
}
