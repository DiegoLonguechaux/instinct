import { cn } from "@/lib/utils";

type PillButtonProps = React.ComponentProps<"a"> & {
  variant?: "filled" | "outline";
};

/**
 * Bouton "pill" du site public (CTA hero + section groupe). Distinct du
 * `Button` shadcn de `components/ui` (utilisé côté admin) car le style
 * (forme, couleurs) est propre à la maquette de la homepage.
 */
export function PillButton({ className, variant = "filled", ...props }: PillButtonProps) {
  return (
    <a
      className={cn(
        "inline-flex items-center justify-center rounded-full px-8 py-3 text-xs font-semibold tracking-widest uppercase transition-colors sm:text-sm",
        variant === "filled" &&
          "bg-instinct-purple text-instinct-foreground hover:bg-instinct-purple/90",
        variant === "outline" &&
          "border border-instinct-foreground/40 text-instinct-foreground hover:border-instinct-purple hover:text-instinct-purple",
        className
      )}
      {...props}
    />
  );
}
