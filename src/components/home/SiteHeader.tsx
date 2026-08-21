"use client";

import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { SocialLinks, type Links } from "./SocialLinks";

const NAV_ITEMS = [
  { href: "#accueil", label: "Accueil" },
  { href: "#le-groupe", label: "Le groupe" },
  { href: "#nos-dates", label: "Nos dates" },
  { href: "#notre-ep", label: "Notre EP" },
  { href: "#le-merch", label: "Merch" },
  { href: "#la-galerie", label: "Galerie" },
];

type SiteHeaderProps = {
  bandName: string;
  logoUrl?: string;
  links?: Links;
  contactEmail?: string;
};

export function SiteHeader({ bandName, logoUrl, links, contactEmail }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* Pas de fond : le header laisse voir le fond de la section en dessous */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <a href="#accueil" className="shrink-0">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={bandName}
              width={200}
              height={60}
              priority
              className="h-14 w-auto"
            />
          ) : (
            <span className="font-serif text-xl text-instinct-foreground">{bandName}</span>
          )}
        </a>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-xs font-semibold tracking-widest text-instinct-foreground/90 uppercase transition-colors hover:text-instinct-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:block">
          <SocialLinks links={links} contactEmail={contactEmail} size="sm" />
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            className="text-instinct-foreground md:hidden"
            aria-label="Ouvrir le menu"
          >
            <Menu className="size-6" />
          </SheetTrigger>
          <SheetContent
            side="right"
            className="border-instinct-purple/30 bg-instinct-bg text-instinct-foreground"
          >
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <nav className="mt-10 flex flex-col gap-6 px-6">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="text-lg font-semibold tracking-widest uppercase"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-auto px-6 pb-6">
              <SocialLinks links={links} contactEmail={contactEmail} size="md" />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
