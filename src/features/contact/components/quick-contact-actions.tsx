import { Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { FaWhatsapp } from "react-icons/fa";
import { company, whatsappHref } from "@/features/catalogue/catalogue";
import styles from "./quick-contact-actions.module.css";

export function QuickContactActions({
  showCall = false,
}: {
  showCall?: boolean;
}) {
  const t = useTranslations("Website.premiumHome");

  return (
    <nav className={styles.actions} aria-label={t("quickContact")}>
      <a
        className={styles.whatsapp}
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("whatsapp")}
        title={t("whatsapp")}
      >
        <FaWhatsapp aria-hidden="true" />
      </a>
      {showCall && (
        <a
          className={styles.call}
          href={`tel:${company.whatsapp.replace(/[^+\d]/g, "")}`}
          aria-label={t("call")}
          title={t("call")}
        >
          <Phone aria-hidden="true" />
        </a>
      )}
    </nav>
  );
}
