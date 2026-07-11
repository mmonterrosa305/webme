/** Host clients should CNAME (www) or point their domain toward. */
export function getWebmeSiteHost(): string {
  return (
    process.env.WEBME_SITE_HOST?.trim() ||
    process.env.NEXT_PUBLIC_WEBME_SITE_HOST?.trim() ||
    "webme-x6ed.onrender.com"
  );
}

/**
 * Optional apex A-record IP for registrars that don't support ALIAS/ANAME.
 * Leave unset to show CNAME-only guidance for www + note about apex.
 */
export function getWebmeDnsARecordIp(): string | null {
  const value =
    process.env.WEBME_DNS_A_RECORD?.trim() ||
    process.env.NEXT_PUBLIC_WEBME_DNS_A_RECORD?.trim() ||
    "";
  return value || null;
}
