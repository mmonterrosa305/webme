export type ClientPlan = "starter" | "monthly" | "premium";

export type ClientStatus = "active" | "payment_failed";

export type Client = {
  id: string;
  lead_id: string;
  business_name: string;
  package: ClientPlan | string;
  owner_email: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  subscription_status: ClientStatus | string;
  one_time_amount: number;
  monthly_amount: number;
  created_at: string;
};
