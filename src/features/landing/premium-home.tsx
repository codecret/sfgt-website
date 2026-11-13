import Image from "next/image";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  Building2,
  FlaskConical,
  Package,
  Phone,
  Wheat,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { categoryBySlug } from "@/features/catalogue/catalogue";
import { Link } from "@/i18n/navigation";
import { PremiumProducts, ToshibaShowcase } from "./premium-products";
import {
  PremiumCompany,
  PremiumFooter,
  PremiumProcess,
  PremiumQuotation,
  PremiumServices,
} from "./premium-company";
import { CategoryNavigation } from "./category-navigation";
import { PremiumHomeMotion } from "./premium-home-motion";
import { HeroBulb } from "./hero-bulb";
import "./premium-home.css";

export async function PremiumHome({
  locale,
  deliveryEnabled,
}: {
  locale: string;
  deliveryEnabled: boolean;
}) {
  const t = await getTranslations({ locale, namespace: "Website.premiumHome" });
  const categoryLinks = [
    {
      key: "batteries",
      href: "/products/batteries",
      image: "/images/supplier-home/product-battery-6.jpg",
    },
    {
      key: "lighting",
      href: "/products/led-lighting",
      image: "/images/premium-home/lighting-thumb.webp",
    },
    {
      key: "commodities",
      href: "/products/commodities",
      image: "/images/premium-home/commodities-thumb.webp",
    },
    {
      key: "tekbatt",
      href: "/products/tekbatt-batteries",
      image: categoryBySlug.get("tekbatt-batteries")!.image,
    },
  ];
  const commodityLinks = [
    { key: "sugar", slug: "sugar", image: "sugar-v1.webp" },
    { key: "oils", slug: "edible-oils", image: "edible-oils-v1.webp" },
    { key: "grains", slug: "seeds", image: "seeds-v1.webp" },
    { key: "meat", slug: "meat-and-fish", image: "meat-poultry-v1.webp" },
  ];
  const otherLinks = [
    { key: "chemicals", slug: "chemicals", icon: FlaskConical },
    { key: "construction", slug: "construction-materials", icon: Building2 },
    { key: "hospitality", slug: "hospitality", icon: Package },
    { key: "otherFood", slug: "other-food-products", icon: Wheat },
  ];
  return (
    <div className="premium-home public-surface supplier-home">
      <main id="main-content" tabIndex={-1}>
        <section className="premium-hero" aria-labelledby="hero-heading">
          <div className="premium-hero-art">
            <Image
              src="/images/premium-home/hero-dubai-off.webp"
              alt={t("hero.imageAlt")}
              fill
              priority
              sizes="(max-width: 767px) 870px, (max-width: 1023px) 1024px, (max-width: 1859px) 1860px, 100vw"
            />
            <HeroBulb />
          </div>
          <div className="premium-container premium-hero-inner">
            <div className="premium-hero-copy">
              <h1 id="hero-heading">
                <span>{t("hero.line1")}</span>
                <span>{t("hero.line2")}</span>
                <span>
                  {t("hero.prefix")} <em>{t("hero.highlight")}</em>
                </span>
              </h1>
              <p className="premium-hero-description">
                {t("hero.description")}
              </p>
              <div className="premium-hero-actions">
                <Link href="/products" className="premium-button">
                  {t("browse")}
                  <ArrowRight aria-hidden="true" />
                </Link>
                <a href="#quotation" className="premium-button-outline">
                  {t("quote")}
                </a>
              </div>
            </div>
            <p className="premium-hero-note" aria-hidden="true">
              {t("hero.note1")}
              <br />
              {t("hero.note2")}
              <br />
              <span>{t("hero.note3")}</span>
            </p>
          </div>
        </section>

        <CategoryNavigation
          label={t("categories.label")}
          allLabel={t("viewAll")}
        >
          {categoryLinks.map((category) => (
            <Link
              className="premium-category-tile"
              key={category.key}
              href={category.href}
            >
              <span className="premium-category-image">
                <Image
                  src={category.image}
                  className={
                    category.key === "commodities"
                      ? "premium-category-photo"
                      : undefined
                  }
                  unoptimized={category.key === "commodities"}
                  quality={category.key === "tekbatt" ? 90 : undefined}
                  alt=""
                  loading="eager"
                  width={56}
                  height={56}
                />
              </span>
              <strong>{t(`categories.${category.key}`)}</strong>
              <ArrowRight aria-hidden="true" />
            </Link>
          ))}
        </CategoryNavigation>

        <PremiumProducts locale={locale} />
        <ToshibaShowcase locale={locale} />

        <section
          className="premium-commodities premium-container"
          id="commodities"
          aria-labelledby="premium-commodities-title"
        >
          <div className="premium-section-heading" data-premium-reveal>
            <div>
              <h2 id="premium-commodities-title">{t("commodities.title")}</h2>
              <p>{t("commodities.description")}</p>
            </div>
            <Link href="/products/commodities" className="premium-link">
              {t("commodities.explore")}
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <div className="premium-commodity-grid">
            {commodityLinks.map((category) => (
              <Link
                className="premium-commodity-card"
                key={category.key}
                href={`/products/${category.slug}`}
                data-premium-reveal
              >
                <div className="premium-commodity-image">
                  <Image
                    src={`/images/supplier-home/generated/${category.image}`}
                    alt={t(`commodities.${category.key}.alt`)}
                    fill
                    sizes="(max-width: 767px) 112px, (max-width: 1023px) 45vw, 23vw"
                  />
                </div>
                <div className="premium-commodity-caption">
                  <div>
                    <h3>{t(`commodities.${category.key}.title`)}</h3>
                    <p>{t(`commodities.${category.key}.description`)}</p>
                  </div>
                  <ArrowRight aria-hidden="true" />
                </div>
              </Link>
            ))}
          </div>
          <div className="premium-commodity-more">
            {otherLinks.map(({ key, slug, icon: Icon }) => (
              <Link href={`/products/${slug}`} key={key}>
                <span>
                  <Icon aria-hidden="true" />
                </span>
                {t(`commodities.${key}`)}
              </Link>
            ))}
            <Link href="/products/commodities" className="premium-link">
              {t("commodities.viewAll")}
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>

        <PremiumCompany locale={locale} />
        <PremiumServices locale={locale} />
        <PremiumProcess locale={locale} />
        <PremiumQuotation locale={locale} deliveryEnabled={deliveryEnabled} />
      </main>
      <PremiumFooter locale={locale} />
      <nav className="premium-contact-actions" aria-label={t("quickContact")}>
        <a
          className="premium-whatsapp"
          href="https://wa.me/971503420157"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("whatsapp")}
          title={t("whatsapp")}
        >
          <FaWhatsapp aria-hidden="true" />
        </a>
        <a
          className="premium-call"
          href="tel:+971503420157"
          aria-label={t("call")}
          title={t("call")}
        >
          <Phone aria-hidden="true" />
        </a>
      </nav>
      <PremiumHomeMotion />
    </div>
  );
}
