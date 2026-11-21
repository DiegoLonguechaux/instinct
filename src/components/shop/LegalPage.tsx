import { ShopShell } from './ShopShell';

/** Champ à renseigner par le groupe : volontairement très visible tant qu'il n'est pas remplacé. */
export function Todo({ children }: { children: React.ReactNode }) {
  return <mark className="bg-instinct-purple/30 px-1 text-instinct-foreground">[À COMPLÉTER : {children}]</mark>;
}

export function LegalPage({ title, updatedAt, children }: { title: string; updatedAt: string; children: React.ReactNode }) {
  return (
    <ShopShell>
      <article className="mx-auto max-w-3xl">
        <h1 className="font-serif text-4xl uppercase sm:text-5xl">{title}</h1>
        <p className="mt-2 text-sm text-instinct-foreground/50">Dernière mise à jour : {updatedAt}</p>
        <div className="mt-8 space-y-4 leading-relaxed text-instinct-foreground/85 [&_h2]:mt-10 [&_h2]:mb-2 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-instinct-foreground [&_h2]:uppercase [&_li]:ml-5 [&_li]:list-disc [&_a]:underline">
          {children}
        </div>
      </article>
    </ShopShell>
  );
}
