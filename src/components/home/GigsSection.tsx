"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { BrushButton } from "./BrushButton";

export type Concert = {
  id: string;
  date: string;
  venue: string;
  description?: string;
  link?: string;
};

type GigsSectionProps = {
  bandName: string;
  concerts: Concert[];
  contactEmail?: string;
};

type Tab = "futures" | "passees";

const TABS: { key: Tab; label: string }[] = [
  { key: "futures", label: "Futures" },
  { key: "passees", label: "Passées" },
];

const PAGE_SIZE = 10;

function formatConcertDate(iso: string) {
  const date = new Date(iso);
  return {
    day: new Intl.DateTimeFormat("fr-FR", { day: "2-digit" }).format(date),
    month: new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(date),
    year: new Intl.DateTimeFormat("fr-FR", { year: "numeric" }).format(date),
  };
}

export function GigsSection({ bandName, concerts, contactEmail }: GigsSectionProps) {
  const [tab, setTab] = useState<Tab>("futures");
  const [page, setPage] = useState(1);
  // Lu une seule fois au montage plutôt qu'à chaque rendu (Date.now() est
  // impur et ne doit pas être appelé directement dans un useMemo).
  const [now] = useState(() => Date.now());

  // Séparation futures/passées faite côté client (comparaison à "maintenant"),
  // pas de champ dédié en base : on trie chaque liste dans un ordre logique
  // (futures = plus proche d'abord, passées = plus récente d'abord).
  const { futures, passees } = useMemo(() => {
    const futures = concerts
      .filter((concert) => new Date(concert.date).getTime() >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const passees = concerts
      .filter((concert) => new Date(concert.date).getTime() < now)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return { futures, passees };
  }, [concerts, now]);

  const activeList = tab === "futures" ? futures : passees;
  const totalPages = Math.max(1, Math.ceil(activeList.length / PAGE_SIZE));
  const paginatedList = activeList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <section
      id="nos-dates"
      className="relative scroll-mt-20 overflow-hidden bg-instinct-bg px-4 py-20 sm:px-6 lg:px-8"
    >
      {/* Fond en CSS répété verticalement (pas next/image fill) : la section a
          une hauteur variable selon le nombre de dates affichées, et un fill
          + object-cover étirerait/zoomerait l'image au-delà de sa résolution
          native dès que la section dépasse la hauteur du fichier source. */}
      <div className="absolute inset-0 bg-[url('/assets/bg-gigs-phone.png')] bg-[length:100%_auto] bg-repeat-y sm:hidden" />
      <div className="absolute inset-0 hidden bg-[url('/assets/bg-gigs.png')] bg-[length:100%_auto] bg-repeat-y sm:block" />
      <div className="absolute inset-0 bg-instinct-bg/10" />

      <div className="relative mx-auto max-w-4xl">
        {/* Titre centré. "relative" à nouveau requis : le logo en filigrane
            juste en dessous est en `absolute`, centré derrière le texte. */}
        <div className="relative mx-auto mb-12 w-fit" data-aos="fade-up">
          <Image
            src="/assets/LOGO_INSTINCT_PURPLE.png"
            alt=""
            width={686}
            height={146}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 w-[180%] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-50"
          />
          <h2 className="relative font-serif text-4xl text-instinct-foreground uppercase sm:text-5xl md:text-6xl">
            Dates
          </h2>
        </div>

        {/* Onglets custom : le fil barbelé court sert d'indicateur d'onglet actif. */}
        <div className="mb-8 flex gap-8">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                setPage(1);
              }}
              aria-pressed={tab === key}
              className={`relative pb-3 text-sm tracking-widest uppercase transition-colors ${
                tab === key ? "text-instinct-foreground font-bold" : "text-instinct-foreground/60 font-thin hover:text-instinct-foreground/80 cursor-pointer"
              }`}
            >
              {label}
              {tab === key && (
                // eslint-disable-next-line @next/next/no-img-element -- SVG décoratif, pas besoin de next/image
                <img
                  src="/assets/barbed_wired_tab.svg"
                  alt=""
                  aria-hidden="true"
                  className="absolute -bottom-px left-0 h-auto w-32"
                />
              )}
            </button>
          ))}
        </div>

        {activeList.length === 0 ? (
          <p className="py-10 text-center text-sm text-instinct-foreground/60">
            {tab === "futures" ? "Aucune date à venir pour le moment." : "Aucune date passée pour le moment."}
          </p>
        ) : (
          <ul className="divide-y divide-instinct-foreground/10" data-aos="fade-up">
            {paginatedList.map((concert) => {
              const { day, month, year } = formatConcertDate(concert.date);
              return (
                <li key={concert.id} className="flex items-center gap-4 py-5 sm:gap-6">
                  <div className="w-16 shrink-0 text-center">
                    <div className="font-bold text-2xl text-instinct-purple">{day}</div>
                    <div className="text-[10px] tracking-widest text-instinct-purple font-bold uppercase">
                      {month}
                    </div>
                    <div className="text-[10px] text-instinct-purple font-bold">{year}</div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold tracking-wide text-instinct-foreground uppercase sm:text-base">
                      {concert.venue}
                    </p>
                    {concert.description && (
                      <p className="mt-1 text-sm text-instinct-foreground uppercase font-thin sm:text-sm">{concert.description}</p>
                    )}
                  </div>

                  {tab === "futures" && concert.link && (
                    <BrushButton href={concert.link} target="_blank" rel="noreferrer" size="lg" className="shrink-0">
                      Tickets
                    </BrushButton>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-3">
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setPage(pageNumber)}
                aria-current={page === pageNumber ? "page" : undefined}
                className={`text-sm tracking-widest transition-colors ${
                  page === pageNumber
                    ? "font-bold text-instinct-purple"
                    : "text-instinct-foreground/60 hover:text-instinct-foreground/80"
                }`}
              >
                {pageNumber}
              </button>
            ))}
          </div>
        )}

        {contactEmail && (
          <div className="mt-16 flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-instinct-foreground">
              Intéressé pour qu&rsquo;<strong className="font-bold text-instinct-purple">{bandName}</strong> soit le <strong className="font-bold text-instinct-purple">prochain groupe</strong> à jouer dans <strong className="font-bold text-instinct-purple">votre lieu</strong> ?
            </p>
            <BrushButton href={`mailto:${contactEmail}`} className="shrink-0">
              Contactez-nous
            </BrushButton>
          </div>
        )}
      </div>
    </section>
  );
}
