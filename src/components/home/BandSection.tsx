import Image from "next/image";
import { BioContent } from "./BioContent";

type BandSectionProps = {
  bandName: string;
  bio?: string;
  groupPhotoUrl?: string;
  contactEmail?: string;
};

export function BandSection({ bandName, bio, groupPhotoUrl, contactEmail }: BandSectionProps) {
  return (
    <section
      id="le-groupe"
      className="relative scroll-mt-20 overflow-hidden bg-instinct-bg px-4 py-20 sm:px-6 lg:px-8"
    >
      <Image src="/assets/bg-band.png" alt="" fill sizes="100vw" className="object-cover object-center" />
      <div className="absolute inset-0 bg-instinct-bg/60" />

      <div className="relative mb-8 inline-block">
        <Image
          src="/assets/LOGO_INSTINCT_PURPLE.png"
          alt=""
          width={686}
          height={146}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 w-[180%] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-30"
        />
        <h2 className="relative font-serif uppercase text-4xl text-instinct-foreground sm:text-5xl md:text-6xl">
          Le groupe
        </h2>
      </div>
      <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 items-start gap-12 md:grid-cols-2 md:gap-16">
        <div>

          {bio && <BioContent html={bio} className="text-instinct-foreground/90" />}
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div className="relative aspect-4/5 w-full overflow-hidden">
            {groupPhotoUrl && (
              <Image
                src={groupPhotoUrl}
                alt={bandName}
                fill
                sizes="(min-width: 768px) 40vw, 90vw"
                className="object-cover"
              />
            )}

            {/* eslint-disable-next-line @next/next/no-img-element -- barbed_wire.svg n'a pas besoin de l'optimiseur next/image */}
            <img
              src="/assets/barbed_wire.svg"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -top-6 -right-3 hidden h-40 w-auto sm:block md:h-56"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
