import { useTranslations } from "next-intl";
import { FaInstagram, FaLinkedinIn, FaTiktok } from "react-icons/fa";
import styles from "./footer-socials.module.css";

const platforms = [
  { key: "linkedin", name: "LinkedIn", Icon: FaLinkedinIn },
  { key: "instagram", name: "Instagram", Icon: FaInstagram },
  { key: "tiktok", name: "TikTok", Icon: FaTiktok },
] as const;

const brands = [
  {
    key: "toshiba",
    linkedin:
      "https://www.linkedin.com/company/toshiba-sfgt-bts-holding-batteries/",
    instagram: "https://www.instagram.com/sfgt_tbts/",
    tiktok: "https://www.tiktok.com/@toshibabtsgcc",
  },
  {
    key: "tekbatt",
    linkedin: "https://www.linkedin.com/company/tekbatt/",
    instagram: "https://www.instagram.com/tekbatt/",
    tiktok: "https://www.tiktok.com/@tekbatt",
  },
] as const;

export function FooterSocials() {
  const t = useTranslations("Website.footer.socials");

  return (
    <nav className={styles.socials} aria-label={t("label")}>
      {brands.map((brand) => {
        const name = t(brand.key);

        return (
          <div key={brand.key}>
            <p className={styles.brand}>{name}</p>
            <ul className={styles.links}>
              {platforms.map(({ key, name: platform, Icon }) => (
                <li key={key}>
                  <a
                    href={brand[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("profile", { brand: name, platform })}
                  >
                    <Icon aria-hidden="true" />
                    <bdi lang="en">{platform}</bdi>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
