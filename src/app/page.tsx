import { BandSection } from "@/components/home/BandSection";
import { HeroSection } from "@/components/home/HeroSection";
import { SectionDivider } from "@/components/home/SectionDivider";
import { SiteHeader } from "@/components/home/SiteHeader";
import dbConnect from "@/lib/db";
import ConcertModel from "@/models/Concert";
import GalleryItemModel from "@/models/GalleryItem";
import GroupInfoModel from "@/models/GroupInfo";
import MerchModel from "@/models/Merch";
import ReleaseModel from "@/models/Release";

function formatDate(value: Date | string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

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
        contactEmail: groupInfoDoc.contactEmail ?? "",
        links: groupInfoDoc.links ?? {},
      }
    : null;

  return (
    <>
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

      <SectionDivider src="/assets/br-2.png" />

      <BandSection
        bandName={groupInfo?.bandName || "INSTINCT"}
        bio={groupInfo?.bio}
        groupPhotoUrl={groupInfo?.groupPhotoUrl}
        contactEmail={groupInfo?.contactEmail}
      />

      {/* Sections suivantes : pas encore intégrées visuellement, seulement le
          fetch de données + les ancres pour que la nav fonctionne dès maintenant. */}
      <main className="space-y-8 bg-instinct-bg p-6 text-instinct-foreground">

      <section id="nos-dates" className="scroll-mt-20">
        <h2 className="text-xl font-semibold">Concerts</h2>
        {concertsDocs.length === 0 ? (
          <p>Aucun concert.</p>
        ) : (
          <ul>
            {concertsDocs.map((concert) => (
              <li key={String(concert._id)}>
                <strong>{formatDate(concert.date)}</strong> — {concert.venue}
                {concert.description ? ` (${concert.description})` : ""}
                {concert.link ? (
                  <>
                    {" "}
                    <a href={concert.link} target="_blank" rel="noreferrer">Lien</a>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="notre-ep" className="scroll-mt-20">
        <h2 className="text-xl font-semibold">Sorties</h2>
        {releasesDocs.length === 0 ? (
          <p>Aucune sortie.</p>
        ) : (
          <ul>
            {releasesDocs.map((release) => (
              <li key={String(release._id)}>
                <strong>{release.type?.toUpperCase()}</strong> — {release.name}
                {release.coverUrl ? ` | pochette: ${release.coverUrl}` : ""}
                {release.links ? (
                  <pre>{JSON.stringify(release.links, null, 2)}</pre>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="le-merch" className="scroll-mt-20">
        <h2 className="text-xl font-semibold">Merch</h2>
        {merchDocs.length === 0 ? (
          <p>Aucun article merch.</p>
        ) : (
          <ul>
            {merchDocs.map((item) => (
              <li key={String(item._id)}>
                <strong>{item.title}</strong> — {item.price}€
                {item.sizes?.length ? ` | tailles: ${item.sizes.join(", ")}` : ""}
                {item.images?.length ? (
                  <pre>{JSON.stringify(item.images, null, 2)}</pre>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="la-galerie" className="scroll-mt-20">
        <h2 className="text-xl font-semibold">Galerie</h2>
        {galleryDocs.length === 0 ? (
          <p>Aucune photo.</p>
        ) : (
          <ul>
            {galleryDocs.map((photo) => (
              <li key={String(photo._id)}>
                <strong>{photo.title}</strong>
                {photo.description ? ` — ${photo.description}` : ""}
                {photo.imageUrl ? ` | image: ${photo.imageUrl}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
      </main>
    </>
  );
}
