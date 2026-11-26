"use client";

import { useCart } from "@/components/shop/CartProvider";
import { shopButtonClass } from "@/components/shop/styles";
import { cn } from "@/lib/utils";
import { useState } from "react";

type Variant = { size: string; quantity: number };

// Même plafond que la fiche produit et le panier (CartProvider).
const MAX_QTY_PER_LINE = 10;

/** Ajout rapide au panier depuis la vitrine : choix de la taille (si besoin) puis bouton. */
export function MerchQuickAdd({ merchId, variants }: { merchId: string; variants: Variant[] }) {
  const { add, open, lines } = useCart();
  const hasSizes = variants.some((variant) => variant.size !== "");
  // Sans taille, la seule variante est celle de la chaîne vide.
  const [size, setSize] = useState(hasSizes ? "" : variants[0]?.size ?? "");
  const [error, setError] = useState("");

  const selected = variants.find((variant) => variant.size === size);
  const inCart = lines.find((line) => line.merchId === merchId && line.size === size)?.quantity ?? 0;
  const remaining = selected ? Math.max(0, Math.min(selected.quantity, MAX_QTY_PER_LINE) - inCart) : 0;

  const handleAdd = () => {
    if (hasSizes && !selected) {
      setError("Choisissez une taille.");
      return;
    }
    if (remaining <= 0) {
      setError("Maximum disponible déjà dans votre panier.");
      return;
    }
    add(merchId, size, 1);
    setError("");
    open();
  };

  return (
    <div className="mt-4 space-y-3">
      {hasSizes && (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Taille">
          {variants.map((variant) => (
            <button
              key={variant.size}
              type="button"
              role="radio"
              aria-checked={size === variant.size}
              disabled={variant.quantity === 0}
              onClick={() => {
                // Un second clic sur la taille choisie la désélectionne.
                setSize((current) => (current === variant.size ? "" : variant.size));
                setError("");
              }}
              className={cn(
                "min-w-11 border px-3 py-2 text-xs text-instinct-foreground/80 font-semibold cursor-pointer",
                size === variant.size
                  ? "border-instinct-purple bg-instinct-purple text-instinct-bg"
                  : "hover:text-instinct-purple border-instinct-foreground/80 hover:border-instinct-purple",
                variant.quantity === 0 && "cursor-not-allowed line-through opacity-30 hover:border-instinct-foreground/40"
              )}
            >
              {variant.size}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}

      <button type="button" onClick={handleAdd} className={cn(shopButtonClass, "py-3 cursor-pointer")}>
        Ajouter au panier
      </button>
    </div>
  );
}
