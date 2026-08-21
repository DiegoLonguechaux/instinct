import Image from "next/image";

type SectionDividerProps = {
  src: string;
  alt?: string;
};

/**
 * Bandeau séparateur pleine largeur entre deux sections (br-1.png à
 * br-5.png). Générique pour être réutilisé lors des prochaines passes.
 */
export function SectionDivider({ src, alt = "" }: SectionDividerProps) {
  return (
    <div
      className="relative h-10 w-full bg-instinct-bg sm:h-14 md:h-[90px]"
      role={alt ? undefined : "presentation"}
    >
      <Image src={src} alt={alt} fill sizes="100vw" className="object-cover" />
    </div>
  );
}
