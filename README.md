# SFGT Website

The corporate website for **Sulemane Faruk General Trading LLC**, based in Dubai. It includes an English/Arabic product catalogue, Toshiba and Tekbatt ranges, commodities, company information and quotation enquiries.

**Website:** [sfgt-tbts.com](https://sfgt-tbts.com/)

**Repository:** [codecret/sfgt-website](https://github.com/codecret/sfgt-website)

The reusable dashboard starter is maintained separately in [codecret/next-trpc-drizzle-dashboard](https://github.com/codecret/next-trpc-drizzle-dashboard). This repository retains the SFGT website and its existing history.

## Development

Built with Next.js 16, React 19, TypeScript, next-intl and Tailwind CSS. The inherited dashboard uses tRPC, Drizzle/PostgreSQL, Better Auth and shadcn/ui; its admin/auth routes are disabled on the public website by default.

```sh
git clone https://github.com/codecret/sfgt-website.git
cd sfgt-website
npm ci
cp .env.example .env.local
npm run dev
```

Configure the local environment using `.env.example`. The public website and enquiry form run without `DATABASE_URL`. Set it when working on dashboard authentication or running the Drizzle database commands. Do not commit credentials or copy production mailbox credentials into the starter repository.

## Commands

| Command                   | Purpose                                           |
| ------------------------- | ------------------------------------------------- |
| `npm run dev`             | Start the local development server                |
| `npm run build`           | Build for production                              |
| `npm run start`           | Serve the production build                        |
| `npm run lint`            | Run ESLint                                        |
| `npm run typecheck`       | Check TypeScript                                  |
| `npm run check:catalogue` | Check catalogue data and assets                   |
| `npm run db:generate`     | Generate database migrations after schema changes |
| `npm run db:migrate`      | Apply committed migrations                        |

## Source layout

- `src/app/[locale]/(supplier)/page.tsx` renders the public homepage.
- `src/features/landing/` contains the website design, navigation, sketches and hero lighting.
- `src/features/catalogue/` owns product and category data.
- `src/features/contact/` and `src/app/api/enquiry/` handle quotation enquiries.
- `messages/en.json` and `messages/ar.json` contain translations.
- `public/images/` contains product photographs and marketing artwork.

The original brand logo is preserved. Marketing artwork and decorative sketches are not documentary evidence of company facilities.

## Deployment and enquiries

The website deploys through the existing Vercel project **`sfgt-website`**, connected to the `main` branch of this repository. The production domain and mail DNS are managed separately from GitHub repository naming.

See [enquiry delivery](docs/enquiry-delivery.md) for server-side mail configuration, [homepage design](docs/premium-home-design.md) for the current design, and [hero lighting](docs/hero-lighting-assets.md) for image provenance and rebuild instructions. Verify the deployed commit before reporting that a local change is live.

Earlier source investigations and release notes remain in [docs/source-audit](docs/source-audit/HANDOVER.md) and [docs/delivery](docs/delivery/DOMAIN-CUTOVER-2026-10-27.md).

## Acknowledgments and license

Some dashboard components originate from [Shadcn Admin Dashboard](https://github.com/satnaing/shadcn-admin). The project retains its [MIT License](LICENSE).
