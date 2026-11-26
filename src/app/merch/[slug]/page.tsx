import { ProductGallery } from '@/components/shop/ProductGallery';
import { ProductPurchase } from '@/components/shop/ProductPurchase';
import { JsonLd } from '@/components/seo/JsonLd';
import { ShopShell } from '@/components/shop/ShopShell';
import { appUrl } from '@/lib/app-url';
import dbConnect from '@/lib/db';
import { formatPrice, variantsOf } from '@/lib/merch';
import { ensureMerchSlugs } from '@/lib/slug';
import MerchModel from '@/models/Merch';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';

// Le stock change à chaque vente : jamais de page figée au build.
export const dynamic = 'force-dynamic';

const getProduct = cache(async (slug: string) => {
  await dbConnect();
  await ensureMerchSlugs();
  // Même règle que la vitrine : un article masqué n'a pas de page publique.
  return MerchModel.findOne({ slug, visible: { $ne: false } }).lean();
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) {
    return { title: 'Article introuvable | INSTINCT' };
  }

  const description = product.description || `${product.title}, le merch officiel d’INSTINCT.`;
  return {
    title: `${product.title} | INSTINCT`,
    description,
    alternates: { canonical: `/merch/${product.slug}` },
    openGraph: {
      title: product.title,
      description,
      images: product.images?.[0] ? [product.images[0]] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getProduct((await params).slug);
  if (!product) {
    notFound();
  }

  const variants = variantsOf({
    sizes: product.sizes ?? [],
    stock: product.stock ?? 0,
    sizeStock: product.sizeStock ?? {},
  });

  const inStock = variants.some((variant) => variant.quantity > 0);

  return (
    <ShopShell merchBackground>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.title,
          description: product.description || `${product.title}, le merch officiel d’INSTINCT.`,
          image: product.images ?? [],
          brand: { "@type": "Brand", name: "INSTINCT" },
          // Une offre n'est annoncée que pour un article vendable en ligne.
          offers:
            product.sellOnline === true
              ? {
                  "@type": "Offer",
                  url: `${appUrl()}/merch/${product.slug}`,
                  priceCurrency: "EUR",
                  price: product.price,
                  availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                }
              : undefined,
        }}
      />
      <Link
        href="/#le-merch"
        className="mb-8 inline-block text-sm tracking-widest text-instinct-foreground/70 uppercase hover:text-instinct-purple"
      >
        ← Retour au merch
      </Link>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <ProductGallery images={product.images ?? []} title={product.title} />

        <div>
          <h1 className="font-serif text-4xl uppercase sm:text-5xl">{product.title}</h1>
          <p className="mt-4 text-2xl font-semibold tabular-nums">{formatPrice(product.price)}</p>

          {product.description && (
            <p className="mt-6 whitespace-pre-line text-instinct-foreground/80">{product.description}</p>
          )}

          <div className="mt-8">
            <ProductPurchase
              merchId={String(product._id)}
              variants={variants}
              sellOnline={product.sellOnline === true}
            />
          </div>

          <p className="mt-8 text-xs text-instinct-foreground/50">
            Livraison en France, en point relais ou à domicile. Frais de port calculés à la commande.
          </p>
        </div>
      </div>
    </ShopShell>
  );
}
