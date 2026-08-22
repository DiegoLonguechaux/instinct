"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { Dialog } from "radix-ui";
import { useCallback, useEffect, useState } from "react";

export type GalleryPhoto = {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
};

type GallerySectionProps = {
  photos: GalleryPhoto[];
};

// Motif répétitif (pas aléatoire, pour un rendu stable entre le serveur et
// le client) : une photo sur cinq est affichée en grand (2 lignes), pour un
// rendu "bento"/mosaïque plutôt que des lignes uniformes.
function isFeatured(index: number) {
  const positionInGroup = index % 5;
  return positionInGroup === 0 || positionInGroup === 3;
}

export function GallerySection({ photos }: GallerySectionProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const isOpen = activeIndex !== null;

  const showPrev = useCallback(() => {
    setActiveIndex((current) => (current === null ? null : (current - 1 + photos.length) % photos.length));
  }, [photos.length]);
  const showNext = useCallback(() => {
    setActiveIndex((current) => (current === null ? null : (current + 1) % photos.length));
  }, [photos.length]);

  // Navigation au clavier pendant que la visionneuse est ouverte (Échap est
  // déjà géré nativement par Radix Dialog).
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        showPrev();
      } else if (event.key === "ArrowRight") {
        showNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showPrev, showNext]);

  const activePhoto = activeIndex !== null ? photos[activeIndex] : null;

  return (
    // "relative" ici : nécessaire pour que l'image de fond en `fill`
    // s'ancre sur cette section plutôt que sur un ancêtre plus large.
    <section
      id="la-galerie"
      className="relative scroll-mt-20 overflow-hidden bg-instinct-bg px-4 py-20 sm:px-6 lg:px-8"
    >
      <Image src="/assets/bg-gallery.png" alt="" fill sizes="100vw" className="object-cover object-center" />
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
            Galerie
          </h2>
        </div>

        {photos.length === 0 ? (
          <p className="text-center text-sm text-instinct-foreground/60">Aucune photo pour le moment.</p>
        ) : (
          <div
            className="grid auto-rows-[130px] grid-cols-2 gap-3 sm:auto-rows-[150px] sm:grid-cols-3 lg:grid-cols-4"
            data-aos="fade-up"
          >
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Voir la photo ${photo.title}`}
                className={`group relative overflow-hidden ${isFeatured(index) ? "row-span-2" : ""}`}
              >
                <Image
                  src={photo.imageUrl}
                  alt={photo.title}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog.Root open={isOpen} onOpenChange={(open) => !open && setActiveIndex(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/90" />
          <Dialog.Content
            className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none"
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <Dialog.Title className="sr-only">{activePhoto?.title ?? "Photo"}</Dialog.Title>
            <Dialog.Description className="sr-only">
              Visionneuse de la galerie photo, utilisez les flèches pour naviguer.
            </Dialog.Description>

            <Dialog.Close
              aria-label="Fermer"
              className="absolute top-4 right-4 text-instinct-foreground/80 transition-colors hover:text-instinct-foreground"
            >
              <X className="size-8" />
            </Dialog.Close>

            {photos.length > 1 && (
              <button
                type="button"
                onClick={showPrev}
                aria-label="Photo précédente"
                className="absolute left-2 text-instinct-foreground/80 transition-colors hover:text-instinct-foreground sm:left-6"
              >
                <ChevronLeft className="size-10" />
              </button>
            )}

            {activePhoto && (
              <div className="relative h-[75vh] w-full max-w-4xl">
                <Image
                  src={activePhoto.imageUrl}
                  alt={activePhoto.title}
                  fill
                  sizes="90vw"
                  className="object-contain"
                />
              </div>
            )}

            {photos.length > 1 && (
              <button
                type="button"
                onClick={showNext}
                aria-label="Photo suivante"
                className="absolute right-2 text-instinct-foreground/80 transition-colors hover:text-instinct-foreground sm:right-6"
              >
                <ChevronRight className="size-10" />
              </button>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
