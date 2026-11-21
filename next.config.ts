import type { NextConfig } from "next";

type RemotePattern = NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number];

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Interdit d'afficher le site dans une iframe (clickjacking), y compris sur l'admin.
  { key: "X-Frame-Options", value: "DENY" },
  // Évite que le jeton d'un lien de réinitialisation fuite via l'en-tête Referer.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
];

// Domaine public du bucket S3, dérivé de S3_PUBLIC_BASE_URL (Next charge les
// fichiers .env avant d'évaluer ce fichier).
function s3ImagePatterns(): RemotePattern[] {
  const baseUrl = process.env.S3_PUBLIC_BASE_URL;
  if (!baseUrl) {
    return [];
  }

  try {
    const url = new URL(baseUrl);
    return [
      {
        protocol: url.protocol === "http:" ? "http" : "https",
        hostname: url.hostname,
        ...(url.port ? { port: url.port } : {}),
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      // Fichiers uploadés depuis l'admin (photo groupe, logo, kit press,
      // covers, images merch/galerie), stockés sur le bucket S3.
      ...s3ImagePatterns(),
      // Anciennes URLs Vercel Blob : à retirer une fois la migration vers S3 faite.
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
