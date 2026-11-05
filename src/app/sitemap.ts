import type { MetadataRoute } from "next";
import { categories, products } from "@/features/catalogue/catalogue";
import { absoluteUrl } from "@/features/catalogue/metadata";
import { routing } from "@/i18n/routing";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/",
    "/about",
    "/products",
    "/services",
    "/support",
    "/contact",
    "/privacy",
    ...categories.map((category) => `/products/${category.slug}`),
    ...products.map((product) => `/products/${product.slug}`),
  ];
  return paths.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: absoluteUrl(path, locale),
      alternates: {
        languages: {
          en: absoluteUrl(path),
          ar: absoluteUrl(path, "ar"),
          "x-default": absoluteUrl(path),
        },
      },
    }))
  );
}
