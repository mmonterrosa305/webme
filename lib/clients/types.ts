export type ClientPlan = "standard" | "starter" | "monthly" | "premium";

export type ClientStatus = "active" | "payment_failed";

export type DomainStatus = "pending" | "active" | "failed" | null;

export type Client = {
  id: string;
  lead_id: string | null;
  business_name: string;
  package: ClientPlan | string;
  owner_email: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  subscription_status: ClientStatus | string;
  one_time_amount: number;
  monthly_amount: number;
  created_at: string;
  site_url: string | null;
  domain_requested: string | null;
  domain_status: DomainStatus | string | null;
};
