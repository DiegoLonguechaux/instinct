import { cn } from "@/lib/utils";

type BrushButtonProps = React.ComponentProps<"a"> & {
  size?: "sm" | "md" | "lg";
};

const SIZE_CLASSES: Record<NonNullable<BrushButtonProps["size"]>, string> = {
  sm: "px-5 py-2.5 text-[10px] sm:px-6 sm:text-xs",
  md: "px-8 py-3.5 text-xs sm:text-sm",
  lg: "px-10 py-5 text-xs sm:px-12 sm:text-sm",
};

/**
 * Bouton utilisé partout sur le site public : le texte est superposé sur
 * un coup de pinceau (`brush_button.svg`) qui sert de fond, étiré pour
 * s'adapter à la largeur du texte plutôt qu'affiché à son ratio d'origine.
 * Remplace `PillButton`.
 */
export function BrushButton({ className, size = "md", children, ...props }: BrushButtonProps) {
  return (
    <a
      className={cn(
        "inline-flex items-center justify-center gap-2 bg-[url('/assets/brush_button.svg')] bg-[length:100%_100%] bg-no-repeat text-center font-semibold tracking-widest text-instinct-foreground uppercase",
        SIZE_CLASSES[size],
        className
      )}
      {...props}
    >
      {children}
    </a>
  );
}
