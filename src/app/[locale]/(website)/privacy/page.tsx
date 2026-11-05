import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { company } from "@/features/catalogue/catalogue";
import { pageMetadata } from "@/features/catalogue/metadata";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Website.privacy" });
  return pageMetadata({
    title: t("title"),
    description: t("intro"),
    path: "/privacy",
    locale,
  });
}

export default async function PrivacyPage() {
  const t = await getTranslations("Website.privacy");
  const sections = [
    "collect",
    "use",
    "providers",
    "technical",
    "retention",
    "contact",
  ] as const;
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="site-container max-w-4xl py-12 md:py-16"
    >
      <header className="border-b pb-8">
        <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
          {t("intro")}
        </p>
        <p className="mt-5 text-xs text-muted-foreground">{t("updated")}</p>
      </header>
      <div className="divide-y">
        {sections.map((section) => (
          <section
            key={section}
            className="py-7"
            aria-labelledby={`privacy-${section}`}
          >
            <h2 id={`privacy-${section}`} className="text-xl font-semibold">
              {t(`sections.${section}.title`)}
            </h2>
            <p className="mt-3 text-sm leading-8 text-muted-foreground">
              {t(`sections.${section}.body`, { email: company.email })}
            </p>
          </section>
        ))}
      </div>
      <Link
        href="/contact"
        className="inline-flex min-h-11 items-center gap-5 text-sm font-semibold underline underline-offset-4"
      >
        {t("contactLink")}
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </main>
  );
}
