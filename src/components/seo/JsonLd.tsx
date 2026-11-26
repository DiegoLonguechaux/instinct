/** Données structurées (schema.org) lues par Google. `<` est échappé pour qu'un texte saisi en admin ne ferme pas la balise. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
