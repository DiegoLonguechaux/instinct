import Image from "next/image";
import type { ComponentType } from "react";
import { FaAmazon } from "react-icons/fa";
import {
    SiApplemusic,
    SiBandcamp,
    SiDeezer,
    SiSoundcloud,
    SiSpotify,
    SiYoutubemusic,
} from "react-icons/si";
import { BrushButton } from "./BrushButton";

type ReleaseLinks = {
  spotify?: string;
  deezer?: string;
  appleMusic?: string;
  amazonMusic?: string;
  youtubeMusic?: string;
  bandcamp?: string;
  soundcloud?: string;
};

export type Release = {
  id: string;
  type: "single" | "ep" | "album";
  name: string;
  coverUrl?: string;
  links?: ReleaseLinks;
};

type ReleasesSectionProps = {
  bandName: string;
  release?: Release;
};

// Pas d'icône "Amazon Music" dans Simple Icons (même limitation que pour
// SocialLinks) : repli sur une icône générique lucide.
const PLATFORMS: {
  key: keyof ReleaseLinks;
  label: string;
  Icon: ComponentType<{ className?: string }>;
}[] = [
  { key: "spotify", label: "Spotify", Icon: SiSpotify },
  { key: "deezer", label: "Deezer", Icon: SiDeezer },
  { key: "appleMusic", label: "Apple Music", Icon: SiApplemusic },
  { key: "amazonMusic", label: "Amazon Music", Icon: FaAmazon },
  { key: "youtubeMusic", label: "YouTube", Icon: SiYoutubemusic },
  { key: "bandcamp", label: "Bandcamp", Icon: SiBandcamp },
  { key: "soundcloud", label: "SoundCloud", Icon: SiSoundcloud },
];

export function ReleasesSection({ release }: ReleasesSectionProps) {
  const platforms = PLATFORMS.filter((platform) => release?.links?.[platform.key]);

  return (
    // "relative" ici : nécessaire pour que l'image de fond en `fill`
    // s'ancre sur cette section plutôt que sur un ancêtre plus large.
    <section
      id="notre-ep"
      className="relative scroll-mt-20 overflow-hidden bg-instinct-bg px-4 py-20 sm:px-6 lg:px-8"
    >
      <Image
        src="/assets/bg-releases-phone.png"
        alt=""
        fill
        sizes="100vw"
        className="object-cover object-center sm:hidden"
      />
      <Image
        src="/assets/bg-releases.png"
        alt=""
        fill
        sizes="100vw"
        className="hidden object-cover object-center sm:block"
      />
      <div className="absolute inset-0 bg-instinct-bg/0" />

      <div className="relative mx-auto max-w-4xl">
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
            Notre EP
          </h2>
        </div>

        {release ? (
          <div className="grid grid-cols-1 items-center gap-10 sm:grid-cols-[minmax(0,320px)_1fr] sm:gap-12">
            {/* "relative" : la pochette est en `fill`, elle a besoin de ce
                conteneur pour se dimensionner (carré, convention album art). */}
            <div className="relative mx-auto aspect-square w-full max-w-xs overflow-visible" data-aos="fade-left">
              {release.coverUrl && (
                <Image
                  src={release.coverUrl}
                  alt={release.name}
                  fill
                  sizes="(min-width: 640px) 320px, 90vw"
                  className="object-cover"
                />
              )}
            </div>

            <div data-aos="fade-right">
              <h3 className="font-serif text-3xl leading-tight text-instinct-purple uppercase sm:text-4xl md:text-5xl">
                {release.name}
              </h3>

              <p className="mt-4 max-w-md text-sm font-thin text-instinct-foreground sm:text-base">
                Notre premier EP est disponible <strong className="font-bold text-instinct-purple">sur toutes les plateformes</strong> de streaming !
              </p>

              {platforms.length > 0 && (
                <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-md">
                  {platforms.map(({ key, label, Icon }) => (
                    <BrushButton
                      key={key}
                      href={release.links?.[key]}
                      target="_blank"
                      rel="noreferrer"
                      size="md"
                    >
                      <Icon className="size-4 shrink-0" />
                      {label}
                    </BrushButton>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-instinct-foreground/60">Aucune sortie pour le moment.</p>
        )}
      </div>
    </section>
  );
}
