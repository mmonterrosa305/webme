import { isPortalEligiblePlan } from "./constants";
import { sendClientPortalOtp } from "./client-otp";

export { sendClientPortalOtp };

export async function sendClientPortalOtpIfEligible(
  email: string,
  businessName: string,
  plan: string,
): Promise<boolean> {
  if (!isPortalEligiblePlan(plan)) {
    return false;
  }

  await sendClientPortalOtp(email, businessName);
  return true;
}
