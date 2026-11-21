import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Interdit d'afficher le site dans une iframe (clickjacking), y compris sur l'admin.
  { key: "X-Frame-Options", value: "DENY" },
  // Évite que le jeton d'un lien de réinitialisation fuite via l'en-tête Referer.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      // Fichiers uploadés depuis l'admin (photo groupe, logo, kit press,
      // covers, images merch/galerie) une fois migrés vers Vercel Blob.
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
