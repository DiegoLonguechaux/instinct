import { cn } from "@/lib/utils";

type BioContentProps = {
  html: string;
  className?: string;
};

/**
 * Rendu de GroupInfo.bio (HTML brut produit par l'éditeur Tiptap de
 * l'admin). La classe "bio-content" porte les règles CSS (globals.css) qui
 * ajoutent une puce "barbelé" avant chaque paragraphe.
 */
export function BioContent({ html, className }: BioContentProps) {
  return <div className={cn("bio-content", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
