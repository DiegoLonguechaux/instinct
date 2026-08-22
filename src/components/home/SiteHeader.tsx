"use client";

import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { SocialLinks, type Links } from "./SocialLinks";

const NAV_ITEMS = [
  { href: "#accueil", label: "Accueil" },
  { href: "#le-groupe", label: "Le groupe" },
  { href: "#nos-dates", label: "Dates" },
  { href: "#notre-ep", label: "Notre EP" },
  { href: "#le-merch", label: "Merch" },
  { href: "#la-galerie", label: "Galerie" },
];

const HEADER_SOCIAL_KEYS: (keyof Links)[] = ["instagram", "facebook"];

type SiteHeaderProps = {
  bandName: string;
  logoUrl?: string;
  links?: Links;
  contactEmail?: string;
};

export function SiteHeader({ bandName, logoUrl, links, contactEmail }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeHref, setActiveHref] = useState(NAV_ITEMS[0].href);

  // Fond du header : transparent tout en haut, opaque + flouté dès qu'on
  // scrolle un peu.
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Section active : on observe chaque section ancrée et on retient celle
  // qui occupe le centre de l'écran, pour surligner le lien correspondant.
  useEffect(() => {
    const sectionIds = NAV_ITEMS.map((item) => item.href.slice(1));
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) {
      return;
    }

    const visibleIds = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleIds.add(entry.target.id);
          } else {
            visibleIds.delete(entry.target.id);
          }
        });

        const current = sectionIds.find((id) => visibleIds.has(id));
        if (current) {
          setActiveHref(`#${current}`);
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        isScrolled && "bg-instinct-bg/70 backdrop-blur-md"
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <a href="#accueil" className="shrink-0">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={bandName}
              width={200}
              height={60}
              priority
              className="h-12 w-auto"
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
              className={cn(
                "text-sm font-semibold tracking-widest uppercase transition-colors",
                activeHref === item.href
                  ? "text-instinct-purple"
                  : "text-instinct-foreground hover:text-instinct-purple"
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:block">
          <SocialLinks links={links} contactEmail={contactEmail} only={HEADER_SOCIAL_KEYS} size="md" />
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
            className="border-instinct-purple/0 bg-instinct-bg text-instinct-foreground"
          >
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <nav className="mt-10 flex flex-col gap-6 px-6">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "text-lg font-semibold tracking-widest uppercase transition-colors",
                    activeHref === item.href ? "text-instinct-purple" : undefined
                  )}
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-auto px-6 pb-6">
              <SocialLinks links={links} contactEmail={contactEmail} only={HEADER_SOCIAL_KEYS} size="md" />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
