import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import legacyRedirects from "./src/features/catalogue/data/legacy-redirects.json";

const withNextIntl = createNextIntlPlugin();
const canonicalOrigin = "https://sfgt-tbts.com";
const nextConfig: NextConfig = {
  async redirects() {
    const mappedRedirects = legacyRedirects.map((redirect) => ({
      ...redirect,
      has: redirect.has?.map((condition) => ({
        ...condition,
        type: "query" as const,
      })),
    }));
    return [
      ...mappedRedirects.map((redirect) => ({
        ...redirect,
        destination: `${canonicalOrigin}${redirect.destination}`,
        has: [
          {
            type: "host" as const,
            value: "(www|toshiba|commodities)\\.sfgt-tbts\\.com",
          },
          ...(redirect.has ?? []),
        ],
      })),
      ...["toshiba", "commodities"].map((division) => ({
        source: "/",
        has: [{ type: "host" as const, value: `${division}.sfgt-tbts.com` }],
        destination: `${canonicalOrigin}/products/${division === "toshiba" ? "batteries" : "commodities"}`,
        permanent: true,
      })),
      {
        source: "/index.html",
        has: [{ type: "host" as const, value: "commodities.sfgt-tbts.com" }],
        destination: `${canonicalOrigin}/products/commodities`,
        permanent: true,
      },
      {
        source: "/:path*",
        has: [
          {
            type: "host" as const,
            value: "(www|toshiba|commodities)\\.sfgt-tbts\\.com",
          },
        ],
        destination: `${canonicalOrigin}/:path*`,
        permanent: true,
      },
      ...mappedRedirects,
    ];
  },
  images: {
    qualities: [75, 90],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "shadcnblocks.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
