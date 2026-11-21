import Image from 'next/image';
import { AosInit } from '@/components/home/AosInit';
import { SiteFooter } from '@/components/home/SiteFooter';
import { SiteHeader } from '@/components/home/SiteHeader';
import dbConnect from '@/lib/db';
import GroupInfoModel from '@/models/GroupInfo';

/**
 * Habillage commun des pages boutique (fiche produit, panier, commande) :
 * même header/footer que la one-page, sur fond noir.
 */
export async function ShopShell({
  children,
  merchBackground = false,
}: {
  children: React.ReactNode;
  /** Image de fond de la section merch de l'accueil, derrière le contenu. */
  merchBackground?: boolean;
}) {
  await dbConnect();
  const info = await GroupInfoModel.findOne({}).lean();

  const bandName = info?.bandName || 'INSTINCT';
  const logoUrl = info?.logoUrl || undefined;
  const links = info?.links ? JSON.parse(JSON.stringify(info.links)) : undefined;
  const contactEmail = info?.contactEmail || undefined;

  return (
    <div className="min-h-screen bg-instinct-bg text-instinct-foreground">
      <AosInit />
      <SiteHeader bandName={bandName} logoUrl={logoUrl} links={links} contactEmail={contactEmail} onHome={false} />
      {/* "relative" + overflow-hidden : les images de fond en `fill` s'ancrent
          sur cette zone (sous le header, au-dessus du footer). */}
      <div className="relative overflow-hidden">
        {merchBackground && (
          <>
            <Image
              src="/assets/bg-merch-phone.png"
              alt=""
              fill
              sizes="100vw"
              className="object-cover object-center sm:hidden"
            />
            <Image
              src="/assets/bg-merch.png"
              alt=""
              fill
              sizes="100vw"
              className="hidden object-cover object-center sm:block"
            />
          </>
        )}
        <main className="relative mx-auto max-w-6xl px-4 pt-28 pb-24 sm:px-6 lg:px-8">{children}</main>
      </div>
      <SiteFooter
        bandName={bandName}
        logoUrl={logoUrl}
        links={links}
        contactEmail={contactEmail}
        pressKitUrl={info?.pressKitUrl || undefined}
      />
    </div>
  );
}
