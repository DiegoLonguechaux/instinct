// Gabarit commun des mails : mise en page en tables + styles en ligne, la seule
// approche qui s'affiche de façon fiable dans Gmail, Outlook et Apple Mail.

const BRAND = {
  black: '#000000',
  purple: '#9D75A6',
  // Violet plus sombre pour le fond du bouton : texte blanc lisible (contraste > 6).
  purpleDark: '#7A4F85',
  page: '#f3eff5',
  text: '#1f1a22',
  muted: '#6b6470',
};

const FONT = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function appUrl() {
  return (process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type EmailContent = {
  /** Texte d'aperçu affiché par la boîte de réception à côté de l'objet. */
  preheader: string;
  title: string;
  /** Paragraphes (texte brut, échappé automatiquement). */
  paragraphs: string[];
  /** Tableau récapitulatif (articles, livraison...), avec un total optionnel mis en gras. */
  summary?: { rows: { label: string; value: string }[]; total?: { label: string; value: string } };
  /** Code à 6 chiffres mis en avant. */
  code?: string;
  button?: { label: string; url: string };
  /** Petits caractères sous le contenu (ex. "si ce n'est pas vous..."). */
  footnote?: string;
  /** Pied de page : mail automatique (par défaut) ou mail auquel le client peut répondre. */
  canReply?: boolean;
};

export function renderEmail(content: EmailContent) {
  const logoUrl = `${appUrl()}/assets/LOGO_INSTINCT_PURPLE.png`;

  const paragraphs = content.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${BRAND.text};">${escapeHtml(paragraph)}</p>`
    )
    .join('');

  const summary = content.summary
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:8px 0 24px;border-top:1px solid #eee7f0;">
        ${content.summary.rows
          .map(
            (row) => `<tr>
          <td style="padding:10px 0;border-bottom:1px solid #eee7f0;font-size:15px;line-height:1.4;color:${BRAND.text};">${escapeHtml(row.label)}</td>
          <td align="right" style="padding:10px 0 10px 12px;border-bottom:1px solid #eee7f0;font-size:15px;white-space:nowrap;color:${BRAND.text};">${escapeHtml(row.value)}</td>
        </tr>`
          )
          .join('')}
        ${
          content.summary.total
            ? `<tr>
          <td style="padding:14px 0 0;font-size:17px;font-weight:700;color:${BRAND.black};">${escapeHtml(content.summary.total.label)}</td>
          <td align="right" style="padding:14px 0 0 12px;font-size:17px;font-weight:700;white-space:nowrap;color:${BRAND.black};">${escapeHtml(content.summary.total.value)}</td>
        </tr>`
            : ''
        }
      </table>`
    : '';

  const code = content.code
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:8px 0 24px;">
        <tr><td align="center" style="background:${BRAND.page};border:1px solid #e3d9e7;border-radius:12px;padding:20px 12px;">
          <span style="font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:36px;font-weight:700;letter-spacing:10px;color:${BRAND.black};padding-left:10px;">${escapeHtml(content.code)}</span>
        </td></tr>
      </table>`
    : '';

  const button = content.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
        <tr><td align="center" bgcolor="${BRAND.purpleDark}" style="border-radius:10px;">
          <a href="${escapeHtml(content.button.url)}" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(content.button.label)}</a>
        </td></tr>
      </table>
      <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:${BRAND.muted};">Le bouton ne fonctionne pas ? Copiez ce lien dans votre navigateur :<br><a href="${escapeHtml(content.button.url)}" style="color:${BRAND.purpleDark};word-break:break-all;">${escapeHtml(content.button.url)}</a></p>`
    : '';

  const footnote = content.footnote
    ? `<p style="margin:16px 0 0;padding-top:16px;border-top:1px solid #eee7f0;font-size:13px;line-height:1.5;color:${BRAND.muted};">${escapeHtml(content.footnote)}</p>`
    : '';

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(content.title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.page};font-family:${FONT};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(content.preheader)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${BRAND.page};">
  <tr><td align="center" style="padding:32px 12px;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;">
      <tr><td align="center" style="background:${BRAND.black};border-radius:16px 16px 0 0;padding:32px 24px;border-bottom:4px solid ${BRAND.purple};">
        <img src="${logoUrl}" alt="INSTINCT" width="220" style="display:block;width:220px;max-width:100%;height:auto;border:0;font-family:${FONT};font-size:28px;font-weight:700;letter-spacing:6px;color:${BRAND.purple};">
      </td></tr>
      <tr><td style="background:#ffffff;border-radius:0 0 16px 16px;padding:36px 32px;">
        <h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;color:${BRAND.black};">${escapeHtml(content.title)}</h1>
        ${paragraphs}
        ${summary}
        ${code}
        ${button}
        ${footnote}
      </td></tr>
      <tr><td align="center" style="padding:20px 12px;font-size:12px;line-height:1.5;color:${BRAND.muted};">
        Instinct · ${content.canReply ? 'Merch' : 'Espace d’administration<br>Ce message est automatique, merci de ne pas y répondre.'}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  // Version texte : pour les clients sans HTML et pour limiter les filtres anti-spam.
  const text = [
    content.title,
    '',
    ...content.paragraphs,
    ...(content.summary
      ? ['', ...content.summary.rows.map((row) => `${row.label} : ${row.value}`), ...(content.summary.total ? [`${content.summary.total.label} : ${content.summary.total.value}`] : [])]
      : []),
    ...(content.code ? ['', `Code : ${content.code}`] : []),
    ...(content.button ? ['', `${content.button.label} : ${content.button.url}`] : []),
    ...(content.footnote ? ['', content.footnote] : []),
    '',
    'Instinct · Espace d’administration',
  ].join('\n');

  return { html, text };
}
