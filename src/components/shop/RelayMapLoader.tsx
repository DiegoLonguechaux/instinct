'use client';

import dynamic from 'next/dynamic';

// Leaflet touche à `window` : la carte ne se charge que dans le navigateur,
// et seulement quand on affiche des points relais (pas dans le bundle du reste du site).
export const RelayMapLoader = dynamic(() => import('./RelayMap'), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse border border-instinct-foreground/30 bg-instinct-foreground/5 md:h-[30rem]" />,
});
