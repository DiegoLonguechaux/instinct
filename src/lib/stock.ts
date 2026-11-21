import MerchModel from '@/models/Merch';

export type StockLine = { merch: unknown; size: string; quantity: number };

/** Clé Mongo du compteur de stock d'une variante (taille ou stock unique). */
export function stockField(size: string) {
  return size ? `sizeStock.${size}` : 'stock';
}

/**
 * Retire le stock de toutes les lignes de façon atomique et conditionnelle
 * (le décrément n'a lieu que s'il reste assez de pièces). Si une ligne
 * échoue, les précédentes sont remises : tout ou rien.
 */
export async function reserveStock(lines: StockLine[]) {
  const done: StockLine[] = [];

  for (const line of lines) {
    const field = stockField(line.size);
    const result = await MerchModel.updateOne(
      { _id: line.merch, [field]: { $gte: line.quantity } },
      { $inc: { [field]: -line.quantity } }
    );

    if (result.modifiedCount !== 1) {
      await restoreStock(done);
      return { ok: false as const, failed: line };
    }
    done.push(line);
  }

  return { ok: true as const };
}

export async function restoreStock(lines: StockLine[]) {
  await Promise.all(
    lines.map((line) =>
      MerchModel.updateOne({ _id: line.merch }, { $inc: { [stockField(line.size)]: line.quantity } })
    )
  );
}
