import nodemailer, { type Transporter } from 'nodemailer';

// Un seul transport SMTP pour tous les environnements : seules les variables
// d'environnement changent.
//   Local (Mailpit) : SMTP_HOST=localhost SMTP_PORT=1025, pas d'identifiants
//   Prod (Brevo)    : SMTP_HOST=smtp-relay.brevo.com SMTP_PORT=587
//                     SMTP_USER=<identifiant SMTP Brevo> SMTP_PASS=<clé SMTP>
//                     MAIL_FROM="Instinct <adresse-d'un-expéditeur-validé@...>"

let transporter: Transporter | null = null;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const host = process.env.SMTP_HOST;
  if (!host) {
    throw new Error('SMTP_HOST est requis pour envoyer des mails.');
  }

  const user = process.env.SMTP_USER;
  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    // true = TLS direct (port 465). Sinon STARTTLS, rendu obligatoire dès
    // qu'on envoie des identifiants pour ne jamais les faire transiter en clair.
    secure: process.env.SMTP_SECURE === 'true',
    requireTLS: Boolean(user),
    auth: user ? { user, pass: process.env.SMTP_PASS ?? '' } : undefined,
  });

  return transporter;
}

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export async function sendMail(message: MailMessage) {
  await getTransporter().sendMail({
    from: process.env.MAIL_FROM ?? 'Instinct <no-reply@instinct.local>',
    ...message,
  });
}
