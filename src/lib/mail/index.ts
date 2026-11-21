import { OTP_TTL_MS, RESET_TTL_MS } from '@/lib/auth-config';
import { appUrl, renderEmail } from './layout';
import { sendMail } from './transport';

const minutes = (ms: number) => Math.round(ms / 60000);

export async function sendLoginCodeEmail(to: string, firstName: string, code: string) {
  const content = renderEmail({
    preheader: `Votre code de connexion : ${code}`,
    title: 'Votre code de connexion',
    paragraphs: [
      `Bonjour ${firstName},`,
      `Voici le code à saisir pour terminer votre connexion à l’espace d’administration. Il est valable ${minutes(OTP_TTL_MS)} minutes.`,
    ],
    code,
    footnote:
      'Si vous n’êtes pas à l’origine de cette connexion, ignorez ce mail et changez votre mot de passe : quelqu’un connaît peut-être votre mot de passe actuel.',
  });

  await sendMail({ to, subject: `${code} est votre code de connexion Instinct`, ...content });
}

export async function sendPasswordResetEmail(to: string, firstName: string, token: string) {
  const url = `${appUrl()}/reinitialiser-mot-de-passe?token=${encodeURIComponent(token)}`;
  const content = renderEmail({
    preheader: 'Choisissez un nouveau mot de passe pour votre compte.',
    title: 'Réinitialiser votre mot de passe',
    paragraphs: [
      `Bonjour ${firstName},`,
      `Une demande de réinitialisation de mot de passe a été faite pour votre compte. Le lien ci-dessous est valable ${minutes(RESET_TTL_MS)} minutes et ne peut servir qu’une fois.`,
    ],
    button: { label: 'Choisir un nouveau mot de passe', url },
    footnote: 'Si vous n’avez rien demandé, ignorez simplement ce mail : votre mot de passe reste inchangé.',
  });

  await sendMail({ to, subject: 'Réinitialisation de votre mot de passe Instinct', ...content });
}

export async function sendPasswordChangedEmail(to: string, firstName: string) {
  const content = renderEmail({
    preheader: 'Votre mot de passe vient d’être modifié.',
    title: 'Mot de passe modifié',
    paragraphs: [
      `Bonjour ${firstName},`,
      'Le mot de passe de votre compte vient d’être modifié. Toutes vos sessions ouvertes ont été déconnectées.',
    ],
    button: { label: 'Se connecter', url: `${appUrl()}/login` },
    footnote:
      'Si vous n’êtes pas à l’origine de ce changement, contactez immédiatement un super-admin du site.',
  });

  await sendMail({ to, subject: 'Votre mot de passe Instinct a été modifié', ...content });
}
