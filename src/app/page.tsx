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
import dbConnect from "@/lib/db";
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

export default async function Home() {
  await dbConnect();

  const [groupInfoDoc, concertsDocs, releasesDocs, merchDocs, galleryDocs] = await Promise.all([
    GroupInfoModel.findOne({}).lean(),
    ConcertModel.find({}).sort({ date: 1 }).lean(),
    ReleaseModel.find({}).sort({ createdAt: -1 }).lean(),
    MerchModel.find({}).sort({ createdAt: -1 }).lean(),
    GalleryItemModel.find({}).sort({ createdAt: -1 }).lean(),
  ]);

  const groupInfo = groupInfoDoc
    ? {
        bandName: groupInfoDoc.bandName ?? "",
        bio: groupInfoDoc.bio ?? "",
        groupPhotoUrl: groupInfoDoc.groupPhotoUrl ?? "",
        logoUrl: groupInfoDoc.logoUrl ?? "",
        pressKitUrl: groupInfoDoc.pressKitUrl ?? "",
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
    title: item.title ?? "",
    images: item.images ?? [],
  }));

  // GallerySection est un Client Component (lightbox) : mêmes contraintes de
  // sérialisation que pour GigsSection.
  const galleryPhotos = galleryDocs.map((photo) => ({
    id: String(photo._id),
    title: photo.title ?? "",
    description: photo.description ?? "",
    imageUrl: photo.imageUrl ?? "",
  }));

  return (
    <>
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

      <GallerySection photos={galleryPhotos} />

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
