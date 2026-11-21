'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

export type RelayPointSelection = {
  code: string;
  network: string;
  name: string;
  street: string;
  postalCode: string;
  city: string;
};

export type CheckoutState = {
  customer: { email: string; firstName: string; lastName: string; phone: string };
  mode: 'relay' | 'home' | '';
  relayPoint: RelayPointSelection | null;
  address: { street: string; complement: string; postalCode: string; city: string };
};

export const EMPTY_CHECKOUT: CheckoutState = {
  customer: { email: '', firstName: '', lastName: '', phone: '' },
  mode: '',
  relayPoint: null,
  address: { street: '', complement: '', postalCode: '', city: '' },
};

// sessionStorage : le tunnel survit à un rechargement mais pas à la fermeture
// de l'onglet (les coordonnées ne restent pas sur l'appareil).
const STORAGE_KEY = 'instinct_checkout_v1';
const listeners = new Set<() => void>();
let memoryRaw = JSON.stringify(EMPTY_CHECKOUT);

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

function getSnapshot() {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) ?? memoryRaw;
  } catch {
    return memoryRaw;
  }
}

const getServerSnapshot = () => JSON.stringify(EMPTY_CHECKOUT);

function parse(raw: string): CheckoutState {
  try {
    const value = JSON.parse(raw) as Partial<CheckoutState>;
    return {
      customer: { ...EMPTY_CHECKOUT.customer, ...value.customer },
      mode: value.mode === 'relay' || value.mode === 'home' ? value.mode : '',
      relayPoint: value.relayPoint ?? null,
      address: { ...EMPTY_CHECKOUT.address, ...value.address },
    };
  } catch {
    return EMPTY_CHECKOUT;
  }
}

function write(state: CheckoutState) {
  memoryRaw = JSON.stringify(state);
  try {
    window.sessionStorage.setItem(STORAGE_KEY, memoryRaw);
  } catch {
    // Repli mémoire.
  }
  listeners.forEach((listener) => listener());
}

export function useCheckoutState() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const state = useMemo(() => parse(raw), [raw]);
  const update = useCallback((patch: (previous: CheckoutState) => CheckoutState) => {
    write(patch(parse(getSnapshot())));
  }, []);
  return [state, update] as const;
}

export function clearCheckoutState() {
  write(EMPTY_CHECKOUT);
}
