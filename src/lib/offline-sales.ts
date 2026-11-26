import type { MerchItem, PaymentMethod } from '@/lib/merch';

/**
 * Stockage local de la caisse pour fonctionner sans réseau : copie du dernier
 * catalogue chargé et file d'attente des ventes pas encore envoyées. Tout est
 * en localStorage (petit volume) et chaque accès est protégé : le navigateur
 * peut le refuser (navigation privée, données effacées).
 */

const SNAPSHOT_KEY = 'caisse:snapshot:v1';
const QUEUE_KEY = 'caisse:queue:v1';

export type CaisseConcert = { id: string; date: string; venue: string };

export type CaisseSale = {
  id: string;
  items: { title: string; size: string; quantity: number; unitPrice: number }[];
  total: number;
  fee: number;
  net: number;
  paymentMethod: PaymentMethod;
  concertLabel: string;
  status: 'completed' | 'cancelled';
  createdAt: string;
};

export type CaisseSnapshot = {
  products: MerchItem[];
  sales: CaisseSale[];
  concerts: CaisseConcert[];
  savedAt: string;
};

export type PendingSale = {
  clientId: string;
  paymentMethod: PaymentMethod;
  concertId?: string;
  items: { merchId: string; title: string; size: string; quantity: number; unitPrice: number }[];
  total: number;
  createdAt: string;
  // Renseigné quand le serveur a refusé la vente (stock insuffisant, article supprimé...) :
  // elle reste dans la liste, sans être renvoyée, jusqu'à ce que l'utilisateur la traite.
  error?: string;
};

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const loadSnapshot = () => read<CaisseSnapshot>(SNAPSHOT_KEY);

export function saveSnapshot(patch: Partial<Omit<CaisseSnapshot, 'savedAt'>>) {
  const current = loadSnapshot() ?? { products: [], sales: [], concerts: [], savedAt: '' };
  write(SNAPSHOT_KEY, { ...current, ...patch, savedAt: new Date().toISOString() });
}

export const loadQueue = () => read<PendingSale[]>(QUEUE_KEY) ?? [];

/** Renvoie false si la vente n'a pas pu être écrite localement (elle serait alors perdue). */
export const saveQueue = (queue: PendingSale[]) => write(QUEUE_KEY, queue);

/** Vrai pour une erreur réseau (hors-ligne, délai dépassé), faux pour une réponse du serveur. */
export function isNetworkError(error: unknown) {
  return error instanceof TypeError || (error instanceof DOMException && error.name === 'AbortError');
}

/** Stock du catalogue diminué des ventes en attente (que le serveur n'a pas encore décomptées). */
export function applyPendingStock(products: MerchItem[], queue: PendingSale[]) {
  const pending = queue.filter((sale) => !sale.error);
  if (pending.length === 0) {
    return products;
  }

  return products.map((product) => {
    const sold = pending.flatMap((sale) => sale.items).filter((item) => item.merchId === product.id);
    if (sold.length === 0) {
      return product;
    }

    const stock = { ...product.sizeStock };
    let flatStock = product.stock;
    for (const item of sold) {
      if (product.sizes.length > 0) {
        stock[item.size] = Math.max(0, (stock[item.size] ?? 0) - item.quantity);
      } else {
        flatStock = Math.max(0, flatStock - item.quantity);
      }
    }
    const totalStock =
      product.sizes.length > 0 ? product.sizes.reduce((sum, size) => sum + (stock[size] ?? 0), 0) : flatStock;
    return { ...product, stock: flatStock, sizeStock: stock, totalStock };
  });
}
