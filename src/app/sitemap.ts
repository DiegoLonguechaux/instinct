import { appUrl } from "@/lib/app-url";
import dbConnect from "@/lib/db";
import { ensureMerchSlugs } from "@/lib/slug";
import MerchModel from "@/models/Merch";
import type { MetadataRoute } from "next";

// Les fiches produit viennent de la base : pas de sitemap figé au build.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl();

  await dbConnect();
  await ensureMerchSlugs();
  const products = await MerchModel.find({ visible: { $ne: false } })
    .select("slug updatedAt")
    .lean();

  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    ...products
      .filter((product) => product.slug)
      .map((product) => ({
        url: `${base}/merch/${product.slug}`,
        lastModified: product.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    { url: `${base}/cgv`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/mentions-legales`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/confidentialite`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
