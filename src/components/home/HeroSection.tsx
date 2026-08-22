import Image from "next/image";
import { BrushButton } from "./BrushButton";
import { type Links } from "./SocialLinks";

type HeroSectionProps = {
  bandName: string;
  logoUrl?: string;
  // Conservés dans le type pour compatibilité avec l'appelant (page.tsx) même
  // si la rangée d'icônes sociales n'est plus affichée dans le hero.
  links?: Links;
  contactEmail?: string;
};

export function HeroSection({ bandName, logoUrl }: HeroSectionProps) {
  return (
    <section
      id="accueil"
      className="relative flex min-h-screen scroll-mt-20 flex-col items-center justify-center overflow-hidden bg-instinct-bg px-4 pt-24 pb-16 text-center"
    >
      <Image
        src="/assets/bg-home.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-instinct-bg/10" />

      <div className="relative z-10 flex flex-col items-center gap-6">
        {logoUrl && (
          <Image
            src={logoUrl}
            alt={bandName}
            width={1200}
            height={350}
            priority
            className="h-auto w-full max-w-md sm:max-w-2xl md:max-w-4xl lg:max-w-5xl"
          />
        )}

        <p className="font-serif font-normal text-2xl text-instinct-foreground uppercase sm:text-4xl md:text-5xl">
          Shadows Whisper My Name
        </p>

        <BrushButton href="#notre-ep" size="lg" className="mt-4">
          Nouvel EP dispo
        </BrushButton>
      </div>
    </section>
  );
}
