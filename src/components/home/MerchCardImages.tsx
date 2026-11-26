"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { useRef, useState } from "react";

const SIZES = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 90vw";

/**
 * Photos d'une carte merch. Sur mobile (pas de survol) : un slider qu'on fait
 * glisser au doigt, avec des points de repère. À partir de `sm` : la 2e photo
 * apparaît en fondu au survol de la carte (le parent porte la classe `group`).
 */
export function MerchCardImages({ images, title }: { images: string[]; title: string }) {
  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const cover = images[0];
  if (!cover) {
    return null;
  }
  const hoverImage = images[1];

  const onScroll = () => {
    const track = trackRef.current;
    if (track && track.clientWidth > 0) {
      setIndex(Math.round(track.scrollLeft / track.clientWidth));
    }
  };

  return (
    <>
      {hoverImage && (
        <div className="relative sm:hidden">
          {/* scroll-snap natif : le glissement et l'inertie sont gérés par le navigateur. */}
          <div
            ref={trackRef}
            onScroll={onScroll}
            className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {images.map((src, i) => (
              <div key={src} className="relative aspect-4/5 w-full shrink-0 snap-center">
                <Image
                  src={src}
                  alt={i === 0 ? title : `${title}, photo ${i + 1}`}
                  fill
                  sizes={SIZES}
                  className="object-cover"
                />
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-2" aria-hidden="true">
            {images.map((src, i) => (
              <span
                key={src}
                className={cn(
                  "size-2 rounded-full border border-instinct-foreground/70",
                  i === index ? "bg-instinct-foreground" : "bg-instinct-bg/50"
                )}
              />
            ))}
          </div>
        </div>
      )}

      <div className={cn("relative aspect-4/5 w-full overflow-hidden", hoverImage && "hidden sm:block")}>
        <Image src={cover} alt={title} fill sizes={SIZES} className="object-cover" />
        {hoverImage && (
          // alt="" : simple autre vue du même produit, déjà décrit par la photo 1.
          <Image
            src={hoverImage}
            alt=""
            fill
            sizes={SIZES}
            className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        )}
      </div>
    </>
  );
}
