import Image from "next/image";
import { BrushButton } from "./BrushButton";
import { SocialLinks, type Links } from "./SocialLinks";

type SiteFooterProps = {
  bandName: string;
  logoUrl?: string;
  links?: Links;
  contactEmail?: string;
  pressKitUrl?: string;
};

export function SiteFooter({ bandName, logoUrl, links, contactEmail, pressKitUrl }: SiteFooterProps) {
  return (
    // "relative" ici : nécessaire pour que l'image de fond en `fill`
    // s'ancre sur cette section plutôt que sur un ancêtre plus large.
    <footer className="relative overflow-hidden bg-instinct-bg px-4 py-16 sm:px-6 lg:px-8">
      <Image src="/assets/bg-footer.png" alt="" fill sizes="100vw" className="object-cover object-center" />
      <div className="absolute inset-x-0 top-10 h-40 bg-gradient-to-b from-instinct-bg to-transparent sm:h-72" />

      <div className="relative mx-auto max-w-5xl">
        <div className="flex flex-col items-center gap-2 text-center">
          {logoUrl && <Image src={logoUrl} alt={bandName} width={160} height={40} className="h-16 w-auto" />}
        </div>

        <div className="mt-16 grid grid-cols-1 gap-10 sm:grid-cols-3" data-aos="fade-up">
          <div className="space-y-8">
            <div>
              <h3 className="text-sm font-semibold tracking-widest text-instinct-foreground uppercase">
                Suivez-nous
              </h3>
              <SocialLinks links={links} group="social" size="md" className="mt-3" />
            </div>

            <div>
              <h3 className="text-sm font-semibold tracking-widest text-instinct-foreground uppercase">
                Écoutez-nous
              </h3>
              <SocialLinks links={links} group="streaming" size="md" className="mt-3" />
            </div>
          </div>

          {contactEmail && (
            <div>
              <h3 className="text-sm font-semibold tracking-widest text-instinct-foreground uppercase">
                Contactez-nous
              </h3>
              <BrushButton href={`mailto:${contactEmail}`} size="md" className="mt-4">
                Contactez-nous
              </BrushButton>
            </div>
          )}

          {pressKitUrl && (
            <div>
              <h3 className="text-sm font-semibold tracking-widest text-instinct-foreground uppercase">
                notre kit press
              </h3>
              <BrushButton href={pressKitUrl} target="_blank" rel="noreferrer" size="md" className="mt-4">
                télécharger
              </BrushButton>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
