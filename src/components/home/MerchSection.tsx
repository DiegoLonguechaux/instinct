import Image from "next/image";

export type MerchItem = {
  id: string;
  title: string;
  images: string[];
};

type MerchSectionProps = {
  items: MerchItem[];
};

export function MerchSection({ items }: MerchSectionProps) {
  return (
    // "relative" ici : nécessaire pour que l'image de fond en `fill`
    // s'ancre sur cette section plutôt que sur un ancêtre plus large.
    <section
      id="le-merch"
      className="relative scroll-mt-20 overflow-hidden bg-instinct-bg px-4 py-20 sm:px-6 lg:px-8"
    >
      <Image src="/assets/bg-merch.png" alt="" fill sizes="100vw" className="object-cover object-center" />
      <div className="absolute inset-0 bg-instinct-bg/0" />

      <div className="relative mx-auto max-w-6xl">
        {/* Titre centré. "relative" à nouveau requis : le logo en filigrane
            juste en dessous est en `absolute`, centré derrière le texte. */}
        <div className="relative mx-auto mb-12 w-fit" data-aos="fade-up">
          <Image
            src="/assets/LOGO_INSTINCT_PURPLE.png"
            alt=""
            width={686}
            height={146}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 w-[180%] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-50"
          />
          <h2 className="relative font-serif text-4xl text-instinct-foreground uppercase sm:text-5xl md:text-6xl">
            Merch
          </h2>
        </div>

        {items.length === 0 ? (
          <p className="text-center text-sm text-instinct-foreground/60">Aucun article pour le moment.</p>
        ) : (
          // flex-wrap plutôt qu'une grid : les cartes (largeur fixe) tiennent
          // à 3 par ligne sur desktop, et `justify-center` centre les lignes
          // incomplètes (ex. un seul article) au lieu de les coller à gauche.
          <div className="flex flex-wrap justify-center gap-10" data-aos="fade-up">
            {items.map((item) => {
              const cover = item.images[0];
              return (
                <div key={item.id} className="w-full max-w-xs">
                  {cover && (
                    // "relative" : la photo est en `fill`, elle a besoin de ce
                    // conteneur pour se dimensionner.
                    <div className="relative aspect-4/5 w-full overflow-hidden">
                      <Image
                        src={cover}
                        alt={item.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 90vw"
                        className="object-cover"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-16 text-center">
          <p className="text-xs font-bold tracking-widest text-instinct-purple uppercase">Attention</p>
          <p className="mt-2 text-sm font-thin text-instinct-foreground">
            Le merch est vendu <strong className="font-bold text-instinct-foreground">uniquement</strong>
            <br />
            lors de nos concerts
          </p>
        </div>
      </div>
    </section>
  );
}
