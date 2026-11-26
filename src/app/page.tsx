import { AosInit } from "@/components/home/AosInit";
import { BandSection } from "@/components/home/BandSection";
import { GallerySection } from "@/components/home/GallerySection";
import { GigsSection } from "@/components/home/GigsSection";
import { HeroSection } from "@/components/home/HeroSection";
import { MerchSection } from "@/components/home/MerchSection";
import { ReleasesSection } from "@/components/home/ReleasesSection";
import { SectionDivider } from "@/components/home/SectionDivider";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteHeader } from "@/components/home/SiteHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { appUrl } from "@/lib/app-url";
import dbConnect from "@/lib/db";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/lib/seo";
import type { Metadata } from "next";
import { totalStock, variantsOf } from "@/lib/merch";
import { ensureMerchSlugs } from "@/lib/slug";
import { shuffle } from "@/lib/utils";
import ConcertModel from "@/models/Concert";
import GalleryItemModel from "@/models/GalleryItem";
import GroupInfoModel from "@/models/GroupInfo";
import MerchModel from "@/models/Merch";
import ReleaseModel from "@/models/Release";

// Sans appel explicite à cookies()/headers(), Next.js préférerait générer
// cette page une fois pour toutes au build (contenu figé, ne refléterait
// jamais les modifications faites depuis l'admin sans redéploiement). On
// force le rendu dynamique pour que chaque visite lise les données Mongo
// à jour.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  await dbConnect();
  const info = await GroupInfoModel.findOne({}).select("groupPhotoUrl").lean();
  // Visuel des aperçus de lien (Instagram, WhatsApp, Discord...) : la photo du groupe.
  const image = info?.groupPhotoUrl || undefined;

  return {
    alternates: { canonical: "/" },
    openGraph: {
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      url: "/",
      images: image ? [image] : undefined,
    },
    twitter: { title: SITE_TITLE, description: SITE_DESCRIPTION, images: image ? [image] : undefined },
  };
}

export default async function Home() {
  await dbConnect();
  await ensureMerchSlugs();

  const [groupInfoDoc, concertsDocs, releasesDocs, merchDocs, galleryDocs] = await Promise.all([
    GroupInfoModel.findOne({}).lean(),
    ConcertModel.find({}).sort({ date: 1 }).lean(),
    ReleaseModel.find({}).sort({ createdAt: -1 }).lean(),
    // `$ne: false` : les articles créés avant l'ajout du champ restent visibles.
    MerchModel.find({ visible: { $ne: false } }).sort({ createdAt: -1 }).lean(),
    GalleryItemModel.find({}).sort({ createdAt: -1 }).lean(),
  ]);

  const groupInfo = groupInfoDoc
    ? {
        bandName: groupInfoDoc.bandName ?? "",
        bio: groupInfoDoc.bio ?? "",
        groupPhotoUrl: groupInfoDoc.groupPhotoUrl ?? "",
        logoUrl: groupInfoDoc.logoUrl ?? "",
        pressKitUrl: groupInfoDoc.pressKitUrl ?? "",
        latestVideoUrl: groupInfoDoc.latestVideoUrl ?? "",
        contactEmail: groupInfoDoc.contactEmail ?? "",
        links: groupInfoDoc.links ?? {},
      }
    : null;

  // GigsSection est un Client Component (onglets) : on ne peut pas lui passer
  // les documents Mongoose bruts (ObjectId non sérialisable) tels quels.
  const concerts = concertsDocs.map((concert) => ({
    id: String(concert._id),
    date: new Date(concert.date).toISOString(),
    venue: concert.venue ?? "",
    description: concert.description ?? "",
    link: concert.link ?? "",
  }));

  // "Notre EP" : on met en avant la sortie la plus récente.
  const latestReleaseDoc = releasesDocs[0];
  const latestRelease = latestReleaseDoc
    ? {
        id: String(latestReleaseDoc._id),
        type: latestReleaseDoc.type,
        name: latestReleaseDoc.name ?? "",
        coverUrl: latestReleaseDoc.coverUrl ?? "",
        links: latestReleaseDoc.links ?? {},
      }
    : undefined;

  const merch = merchDocs.map((item) => ({
    id: String(item._id),
    slug: item.slug ?? "",
    title: item.title ?? "",
    price: item.price ?? 0,
    images: item.images ?? [],
    sellOnline: item.sellOnline === true,
    inStock:
      totalStock({ sizes: item.sizes ?? [], stock: item.stock ?? 0, sizeStock: item.sizeStock ?? {} }) > 0,
    variants: variantsOf({ sizes: item.sizes ?? [], stock: item.stock ?? 0, sizeStock: item.sizeStock ?? {} }),
  }));

  // GallerySection est un Client Component (lightbox) : mêmes contraintes de
  // sérialisation que pour GigsSection. Le mélange se fait ici (serveur),
  // une seule fois, plutôt que dans le composant client : un Math.random()
  // exécuté pendant le rendu de GallerySection donnerait un ordre différent
  // entre le rendu serveur et l'hydratation côté client (mismatch React).
  const galleryPhotos = shuffle(
    galleryDocs.map((photo) => ({
      id: String(photo._id),
      title: photo.title ?? "",
      description: photo.description ?? "",
      imageUrl: photo.imageUrl ?? "",
    }))
  );

  // Données structurées : fiche du groupe, et chaque concert à venir (peut s'afficher dans Google).
  const bandName = groupInfo?.bandName || "INSTINCT";
  const siteUrl = appUrl();
  const performer = { "@type": "MusicGroup", name: bandName, url: siteUrl };
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const structuredData = [
    {
      "@context": "https://schema.org",
      ...performer,
      genre: "Hardcore",
      description: SITE_DESCRIPTION,
      logo: groupInfo?.logoUrl || undefined,
      image: groupInfo?.groupPhotoUrl || undefined,
      email: groupInfo?.contactEmail || undefined,
      sameAs: Object.values(groupInfo?.links ?? {}).filter(
        (link): link is string => typeof link === "string" && link.startsWith("http")
      ),
    },
    ...concerts
      .filter((concert) => new Date(concert.date) >= startOfToday)
      .map((concert) => ({
        "@context": "https://schema.org",
        "@type": "MusicEvent",
        name: `${bandName} – ${concert.venue}`,
        startDate: concert.date,
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: { "@type": "Place", name: concert.venue, address: concert.venue },
        performer,
        description: concert.description || undefined,
        url: concert.link || siteUrl,
      })),
  ];

  return (
    <>
      <JsonLd data={structuredData} />
      <AosInit />

      <SiteHeader
        bandName={groupInfo?.bandName || "INSTINCT"}
        logoUrl={groupInfo?.logoUrl}
        links={groupInfo?.links}
        contactEmail={groupInfo?.contactEmail}
      />

      <HeroSection
        bandName={groupInfo?.bandName || "INSTINCT"}
        logoUrl={groupInfo?.logoUrl}
        links={groupInfo?.links}
        contactEmail={groupInfo?.contactEmail}
      />

      <SectionDivider src="/assets/br-1.png" />

      <BandSection
        bandName={groupInfo?.bandName || "INSTINCT"}
        bio={groupInfo?.bio}
        groupPhotoUrl={groupInfo?.groupPhotoUrl}
        contactEmail={groupInfo?.contactEmail}
      />

      <SectionDivider src="/assets/br-2.png" />

      <GigsSection
        bandName={groupInfo?.bandName || "INSTINCT"}
        concerts={concerts}
        contactEmail={groupInfo?.contactEmail}
      />

      <SectionDivider src="/assets/br-3.png" />

      <ReleasesSection
        bandName={groupInfo?.bandName || "INSTINCT"}
        release={latestRelease}
      />

      <SectionDivider src="/assets/br-4.png" />

      <MerchSection items={merch} />

      <SectionDivider src="/assets/br-5.png" />

      <GallerySection photos={galleryPhotos} latestVideoUrl={groupInfo?.latestVideoUrl} />

      <SiteFooter
        bandName={groupInfo?.bandName || "INSTINCT"}
        logoUrl={groupInfo?.logoUrl}
        links={groupInfo?.links}
        contactEmail={groupInfo?.contactEmail}
        pressKitUrl={groupInfo?.pressKitUrl}
      />
    </>
  );
}
