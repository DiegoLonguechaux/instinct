import { appUrl } from "@/lib/app-url";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Espace d'administration, API et tunnel de commande : rien à référencer.
      disallow: ["/admin", "/api/", "/login", "/commande", "/panier", "/mot-de-passe-oublie", "/reinitialiser-mot-de-passe"],
    },
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
