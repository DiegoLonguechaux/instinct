import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
