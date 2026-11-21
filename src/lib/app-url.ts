/** URL publique du site (liens des mails, URLs de retour Stripe). */
export function appUrl() {
  return (process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}
