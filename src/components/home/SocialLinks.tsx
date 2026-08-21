import { Facebook, Instagram, Mail, Music, Youtube } from "lucide-react";
import type { ComponentType } from "react";
import {
  SiApplemusic,
  SiBandcamp,
  SiDeezer,
  SiSoundcloud,
  SiSpotify,
  SiTiktok,
  SiYoutubemusic,
} from "react-icons/si";
import { cn } from "@/lib/utils";

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

type SocialLinksProps = {
  links?: Links;
  contactEmail?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
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
}[] = [
  { key: "instagram", label: "Instagram", Icon: Instagram },
  { key: "facebook", label: "Facebook", Icon: Facebook },
  { key: "tiktok", label: "TikTok", Icon: SiTiktok },
  { key: "youtube", label: "YouTube", Icon: Youtube },
  { key: "spotify", label: "Spotify", Icon: SiSpotify },
  { key: "deezer", label: "Deezer", Icon: SiDeezer },
  { key: "appleMusic", label: "Apple Music", Icon: SiApplemusic },
  { key: "amazonMusic", label: "Amazon Music", Icon: Music },
  { key: "youtubeMusic", label: "YouTube Music", Icon: SiYoutubemusic },
  { key: "bandcamp", label: "Bandcamp", Icon: SiBandcamp },
  { key: "soundcloud", label: "SoundCloud", Icon: SiSoundcloud },
];

/**
 * Rangée d'icônes réseaux/streaming, construite dynamiquement à partir des
 * liens réellement renseignés en base (GroupInfo.links) — n'affiche jamais
 * d'icône pour un lien vide.
 */
export function SocialLinks({ links, contactEmail, size = "md", className }: SocialLinksProps) {
  const iconClass = SIZE_CLASSES[size];

  const items: {
    key: string;
    label: string;
    href: string;
    Icon: ComponentType<{ className?: string }>;
    isExternal: boolean;
  }[] = PLATFORMS.filter((platform) => links?.[platform.key]).map((platform) => ({
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
            className="text-instinct-foreground/80 transition-colors hover:text-instinct-foreground"
          >
            <Icon className={iconClass} />
          </a>
        </li>
      ))}
    </ul>
  );
}
