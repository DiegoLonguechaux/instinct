'use client';

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from 'react';
import { CartDrawer } from './CartDrawer';

export type CartLine = { merchId: string; size: string; quantity: number };

const STORAGE_KEY = 'instinct_cart_v1';
const MAX_QTY_PER_LINE = 10;

type CartContextValue = {
  lines: CartLine[];
  /** Nombre total d'articles (pastille du header). */
  count: number;
  /** Faux pendant le rendu serveur et l'hydratation : le panier n'est pas encore lu. */
  ready: boolean;
  add: (merchId: string, size: string, quantity?: number) => void;
  setQuantity: (merchId: string, size: string, quantity: number) => void;
  remove: (merchId: string, size: string) => void;
  clear: () => void;
  replaceAll: (lines: CartLine[]) => void;
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

// Le panier vit dans localStorage, exposé comme un petit store externe : React
// lit le même instantané côté serveur ('[]') puis côté client sans mismatch
// d'hydratation, et se resynchronise tout seul entre onglets.
const listeners = new Set<() => void>();
// Repli si localStorage est indisponible (navigation privée...) : le panier reste en mémoire.
let memoryRaw = '[]';

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function getSnapshot() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? '[]';
  } catch {
    return memoryRaw;
  }
}

const getServerSnapshot = () => '[]';

function parseLines(raw: string): CartLine[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter(
        (line): line is CartLine =>
          typeof line?.merchId === 'string' &&
          typeof line?.size === 'string' &&
          Number.isInteger(line?.quantity) &&
          line.quantity > 0
      )
      .map((line) => ({ ...line, quantity: Math.min(line.quantity, MAX_QTY_PER_LINE) }));
  } catch {
    return [];
  }
}

function writeLines(lines: CartLine[]) {
  const raw = JSON.stringify(lines);
  memoryRaw = raw;
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    // Voir memoryRaw.
  }
  listeners.forEach((listener) => listener());
}

const subscribeNever = () => () => {};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = useSyncExternalStore(subscribeNever, () => true, () => false);
  const [isOpen, setIsOpen] = useState(false);

  const lines = useMemo(() => parseLines(raw), [raw]);

  const update = useCallback((updater: (previous: CartLine[]) => CartLine[]) => {
    writeLines(updater(parseLines(getSnapshot())));
  }, []);

  const add = useCallback(
    (merchId: string, size: string, quantity = 1) =>
      update((previous) => {
        const existing = previous.find((line) => line.merchId === merchId && line.size === size);
        if (existing) {
          return previous.map((line) =>
            line === existing
              ? { ...line, quantity: Math.min(line.quantity + quantity, MAX_QTY_PER_LINE) }
              : line
          );
        }
        return [...previous, { merchId, size, quantity: Math.min(quantity, MAX_QTY_PER_LINE) }];
      }),
    [update]
  );

  const setQuantity = useCallback(
    (merchId: string, size: string, quantity: number) =>
      update((previous) =>
        quantity < 1
          ? previous.filter((line) => !(line.merchId === merchId && line.size === size))
          : previous.map((line) =>
              line.merchId === merchId && line.size === size
                ? { ...line, quantity: Math.min(quantity, MAX_QTY_PER_LINE) }
                : line
            )
      ),
    [update]
  );

  const remove = useCallback(
    (merchId: string, size: string) =>
      update((previous) => previous.filter((line) => !(line.merchId === merchId && line.size === size))),
    [update]
  );

  const clear = useCallback(() => update(() => []), [update]);
  const replaceAll = useCallback((next: CartLine[]) => update(() => next), [update]);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: lines.reduce((sum, line) => sum + line.quantity, 0),
      ready,
      add,
      setQuantity,
      remove,
      clear,
      replaceAll,
      isOpen,
      open,
      close,
    }),
    [lines, ready, add, setQuantity, remove, clear, replaceAll, isOpen, open, close]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartDrawer />
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart doit être utilisé dans <CartProvider>.');
  }
  return context;
}
