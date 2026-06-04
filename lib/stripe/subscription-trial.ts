import type Stripe from "stripe";

/** Free trial length for Pro and Elite monthly subscriptions (days). */
export const SUBSCRIPTION_TRIAL_DAYS = 30;

const FIRST_MONTH_FREE_MESSAGE = "First month free";

export function checkoutCustomTextForTrial(): Stripe.Checkout.SessionCreateParams.CustomText {
  return {
    submit: {
      message: FIRST_MONTH_FREE_MESSAGE,
    },
  };
}

export function subscriptionDataWithTrial(
  metadata: Stripe.MetadataParam,
): Stripe.Checkout.SessionCreateParams.SubscriptionData {
  return {
    trial_period_days: SUBSCRIPTION_TRIAL_DAYS,
    metadata,
  };
}
