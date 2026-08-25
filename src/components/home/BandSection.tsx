import Image from "next/image";
import { BioContent } from "./BioContent";
import { BrushButton } from "./BrushButton";

type BandSectionProps = {
  bandName: string;
  bio?: string;
  groupPhotoUrl?: string;
  contactEmail?: string;
};

export function BandSection({ bandName, bio, groupPhotoUrl, contactEmail }: BandSectionProps) {
  return (
    // "relative" ici : nécessaire pour que l'image de fond en `fill`
    // s'ancre sur cette section plutôt que sur un ancêtre plus large.
    <section
      id="le-groupe"
      className="relative scroll-mt-20 overflow-hidden bg-instinct-bg px-4 py-20 sm:px-6 lg:px-8"
    >
      <Image
        src="/assets/bg-band-phone.png"
        alt=""
        fill
        sizes="100vw"
        className="object-cover object-center sm:hidden"
      />
      <Image
        src="/assets/bg-band.png"
        alt=""
        fill
        sizes="100vw"
        className="hidden object-cover object-center sm:block"
      />
      <div className="absolute inset-0 bg-instinct-bg/10" />

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
            Le groupe
          </h2>
        </div>

        <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2 md:gap-16">
          {bio && (
            // Grid 2 colonnes (auto | 1fr) : par défaut une grid étire ses
            // enfants sur toute la hauteur de la ligne, donc le fil barbelé
            // (1re colonne) prend automatiquement la hauteur de la bio (2e
            // colonne, qui définit la hauteur de la ligne).
            <div className="grid grid-cols-[auto_1fr] gap-4 sm:gap-6" data-aos="fade-right">
              {/* eslint-disable-next-line @next/next/no-img-element -- barbed_wire.svg n'a pas besoin de l'optimiseur next/image */}
              <img
                src="/assets/barbed_wire.svg"
                alt=""
                aria-hidden="true"
                className="h-full w-3 object-cover sm:w-4"
              />
              <div>
                <BioContent html={bio} className="text-instinct-foreground" />
                {contactEmail && (
                  <BrushButton href={`mailto:${contactEmail}`} className="mt-8">
                    Contactez-nous
                  </BrushButton>
                )}
              </div>
            </div>
          )}

          {groupPhotoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- format d'origine conservé (pas de crop imposé par next/image fill)
            <img
              src={groupPhotoUrl}
              alt={bandName}
              data-aos="fade-left"
              className="mx-auto h-auto w-full max-w-lg"
            />
          )}
        </div>
      </div>
    </section>
  );
}
