import dbConnect from '@/lib/db';
import MerchModel from '@/models/Merch';

export function slugify(value: string) {
  return (
    value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'article'
  );
}

/** Slug libre pour un titre : `titre`, puis `titre-2`, `titre-3`... */
export async function uniqueMerchSlug(title: string) {
  const base = slugify(title);
  let candidate = base;

  for (let suffix = 2; await MerchModel.exists({ slug: candidate }); suffix += 1) {
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

/**
 * Attribue un slug aux articles créés avant l'ajout du champ. Une seule
 * requête (vide) une fois la migration faite ; le slug, une fois posé, ne
 * change plus (les liens partagés restent valides si le titre est modifié).
 */
export async function ensureMerchSlugs() {
  await dbConnect();
  const missing = await MerchModel.find({ $or: [{ slug: { $exists: false } }, { slug: '' }] })
    .select('title')
    .lean();

  for (const item of missing) {
    await MerchModel.updateOne({ _id: item._id }, { $set: { slug: await uniqueMerchSlug(item.title) } });
  }
}
