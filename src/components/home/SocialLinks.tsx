import { cn } from "@/lib/utils";
import { Facebook, Instagram, Mail, Youtube } from "lucide-react";
import type { ComponentType } from "react";
import { FaAmazon } from "react-icons/fa";
import {
  SiApplemusic,
  SiBandcamp,
  SiDeezer,
  SiSoundcloud,
  SiSpotify,
  SiTiktok,
  SiYoutubemusic,
} from "react-icons/si";

export type Links = {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
  spotify?: string;
  deezer?: string;
  appleMusic?: string;
  amazonMusic?: string;
  youtubeMusic?: string;
  bandcamp?: string;
  soundcloud?: string;
};

type PlatformGroup = "social" | "streaming";

type SocialLinksProps = {
  links?: Links;
  contactEmail?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Restreint l'affichage à un sous-ensemble de plateformes (ex. pour
   * séparer "Suivez-nous" / "Écoutez-nous" dans le footer). Par défaut,
   * toutes les plateformes renseignées sont affichées ensemble. */
  group?: PlatformGroup;
  /** Restreint aux clés listées explicitement (prioritaire sur `group` si
   * les deux sont fournis, ex. header : juste Instagram + Facebook). */
  only?: (keyof Links)[];
};

const SIZE_CLASSES: Record<NonNullable<SocialLinksProps["size"]>, string> = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
};

// react-icons/si n'a pas d'icône dédiée "Amazon Music" (absente de Simple
// Icons) : on retombe sur une icône générique lucide pour cette plateforme.
const PLATFORMS: {
  key: keyof Links;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  group: PlatformGroup;
}[] = [
  { key: "instagram", label: "Instagram", Icon: Instagram, group: "social" },
  { key: "facebook", label: "Facebook", Icon: Facebook, group: "social" },
  { key: "tiktok", label: "TikTok", Icon: SiTiktok, group: "social" },
  { key: "youtube", label: "YouTube", Icon: Youtube, group: "streaming" },
  { key: "spotify", label: "Spotify", Icon: SiSpotify, group: "streaming" },
  { key: "deezer", label: "Deezer", Icon: SiDeezer, group: "streaming" },
  { key: "appleMusic", label: "Apple Music", Icon: SiApplemusic, group: "streaming" },
  { key: "amazonMusic", label: "Amazon Music", Icon: FaAmazon, group: "streaming" },
  { key: "youtubeMusic", label: "YouTube Music", Icon: SiYoutubemusic, group: "streaming" },
  { key: "bandcamp", label: "Bandcamp", Icon: SiBandcamp, group: "streaming" },
  { key: "soundcloud", label: "SoundCloud", Icon: SiSoundcloud, group: "streaming" },
];

/**
 * Rangée d'icônes réseaux/streaming, construite dynamiquement à partir des
 * liens réellement renseignés en base (GroupInfo.links) — n'affiche jamais
 * d'icône pour un lien vide.
 */
export function SocialLinks({ links, contactEmail, size = "md", className, group, only }: SocialLinksProps) {
  const iconClass = SIZE_CLASSES[size];

  const items: {
    key: string;
    label: string;
    href: string;
    Icon: ComponentType<{ className?: string }>;
    isExternal: boolean;
  }[] = PLATFORMS.filter((platform) => {
    const isAllowed = only ? only.includes(platform.key) : !group || platform.group === group;
    return isAllowed && links?.[platform.key];
  }).map((platform) => ({
    key: platform.key,
    label: platform.label,
    href: links![platform.key] as string,
    Icon: platform.Icon,
    isExternal: true,
  }));

  if (contactEmail) {
    items.push({
      key: "email",
      label: "Email",
      href: `mailto:${contactEmail}`,
      Icon: Mail,
      isExternal: false,
    });
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <ul className={cn("flex flex-wrap items-center gap-4", className)}>
      {items.map(({ key, label, href, Icon, isExternal }) => (
        <li key={key}>
          <a
            href={href}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noreferrer" : undefined}
            aria-label={label}
            className="text-instinct-foreground transition-colors hover:text-instinct-purple"
          >
            <Icon className={iconClass} />
          </a>
        </li>
      ))}
    </ul>
  );
}
