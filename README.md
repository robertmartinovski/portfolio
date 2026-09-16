# Portfolio — Robert Martinovski

Portfolio site for Robert Martinovski (Visual Poetry / CyberPanx), digital illustrator and visual
designer. Live at [robertmartinovski.github.io/portfolio](https://robertmartinovski.github.io/portfolio/).

Built with Angular 22 as a multi-page SPA: a single-scroll home page (hero, featured work, about
with scroll-driven timeline, services, contact) and a `/work` page with category filtering and a
lightbox. Content is bilingual (English / Macedonian) with the preference persisted per visitor.

## Tech stack

| Layer     | Choice                                                              |
| --------- | ------------------------------------------------------------------- |
| Framework | Angular 22 (NgModule-based, **zoneless**, `OnPush` by default)       |
| Language  | TypeScript 6, SCSS                                                   |
| Forms     | Reactive Forms (`@angular/forms`)                                    |
| Contact   | [EmailJS](https://www.emailjs.com/) (`@emailjs/browser`)             |
| Tests     | Vitest + jsdom via `@angular/build:unit-test`                        |
| Styling   | Hand-written SCSS with CSS custom properties (no UI kit)             |
| Deploy    | GitHub Actions → GitHub Pages (`gh-pages` branch)                    |

Notable architecture points:

- **Zoneless + `OnPush`.** There is no `zone.js`. Anything mutating state outside an Angular-managed
  event (IntersectionObserver, `requestAnimationFrame`, promise callbacks) must call
  `ChangeDetectorRef.markForCheck()` or use signals, or the view will not re-render.
- **Components are `standalone: false`** (set in `angular.json` schematics) and declared in
  `AppModule`. The `translate` pipe is the one standalone artifact, because a pipe may only be
  declared by a single NgModule.
- **i18n is runtime, not build-time.** English strings are the dictionary keys; Macedonian lives in
  `src/app/domain/const/translations.const.ts`. Missing keys fall back to English.

## Getting started

Requires Node 22 and npm 10.

```bash
npm ci
npm start          # dev server at http://localhost:4200/
```

### Scripts

| Script              | Purpose                                                            |
| ------------------- | ------------------------------------------------------------------ |
| `npm start`         | Dev server (`ng serve`)                                            |
| `npm run build`     | Production build into `docs/browser/` (not `dist/`)                |
| `npm run build:prod`| Same as `build`, explicit                                          |
| `npm run watch`     | Development build in watch mode                                    |
| `npm test`          | Unit tests (Vitest)                                                |
| `npm run deploy`    | Local production build + push to GitHub Pages via `angular-cli-ghpages` |

### Contact form credentials

The EmailJS identifiers are build-time values, not runtime secrets (the app is fully static).

- Local: copy `src/environments/environment.prod.ts.example` to
  `src/environments/environment.prod.ts` and fill in your keys. That file is gitignored.
- CI: `.github/workflows/deploy.yml` generates the file from repository secrets, so real keys
  never enter the repository.

## Deployment

Pushes to `main` run `.github/workflows/deploy.yml`, which installs, injects the EmailJS
configuration from secrets, builds, and publishes `docs/browser/` to the `gh-pages` branch.

Required repository secrets (Settings → Secrets and variables → Actions):

| Secret                | Source                                  |
| --------------------- | --------------------------------------- |
| `EMAILJS_SERVICE_ID`  | EmailJS → Email Services → Service ID   |
| `EMAILJS_TEMPLATE_ID` | EmailJS → Email Templates → Template ID |
| `EMAILJS_PUBLIC_KEY`  | EmailJS → Account → API keys → Public Key |

Repository Pages settings: **Settings → Pages → Source: Deploy from a branch → `gh-pages` / `(root)`**.

Build notes:

- `angular.json` sets `"outputPath": "docs"` so the build output can be served straight from the
  repository, and `baseHref: "/portfolio/"` in the production configuration to match the
  GitHub Pages project-site path. Change both if the repository is renamed.
- `src/404.html` implements the GitHub Pages SPA redirect: unknown paths (e.g. a refresh on
  `/work`) bounce through it and are restored client-side before the router boots.
- The EmailJS public key is public by design; access control lives in the EmailJS dashboard
  (allowed domains, rate limits), not in key secrecy.

## Internationalisation

- Toggle: flag buttons in the navbar (desktop) and at the bottom of the mobile menu.
- Preference persists in `localStorage` under `vp-portfolio-language`; unknown values fall back
  to `en`. `<html lang>` tracks the active language.
- Usage in templates: `{{ 'Some English copy' | translate }}`. Add the Macedonian equivalent to
  the `mk` map in `translations.const.ts`; until then the English key renders as-is.
- `SeoService` and the static `index.html` meta tags intentionally stay English.

## Project structure

```
src/
├── app/
│   ├── core/services/        # scroll, cursor, seo, email, language
│   ├── domain/
│   │   ├── const/            # artworks, services, nav, socials, translations, site identity
│   │   └── interfaces/       # Artwork, ServiceCard, NavItem
│   ├── pages/                # home.page, work.page
│   └── shared/
│       ├── components/       # navbar, footer, artwork-card, image-viewer, contact-form, ...
│       └── pipes/            # translate, truncate
├── assets/images/            # artworks (full-res), thumbnails (webp), featured, icons,
│                             # languages (flag svgs), about
├── environments/             # environment.ts + gitignored environment.prod.ts
├── 404.html                  # GitHub Pages SPA redirect
└── index.html                # SEO / Open Graph / Twitter meta
```

## Assets

- Artwork originals live in `src/assets/images/artworks/` and are referenced by `ARTWORKS` in
  `artworks.const.ts`; grid cards load WebP thumbnails from `src/assets/images/thumbnails/`.
- Thumbnails are generated from the originals with `cwebp` (longest edge 800px, quality 80), e.g.
  `cwebp -q 80 -resize 800 0 artworks/image_1.png -o thumbnails/image_1.webp`.
- `docs/` is build output and is gitignored; if it was ever committed, untrack it with
  `git rm -r --cached docs`.

## Testing

```bash
npm test
```

Unit tests run under Vitest with jsdom. Two environment quirks are handled in the specs: jsdom
provides no `IntersectionObserver` and never fires image `load` events, so both are stubbed where
needed; and because the app is zoneless, tests that flip the language drive a change-detection
pass with `ApplicationRef.tick()`.

## Code style

Prettier is configured (`.prettierrc`); format with `npx prettier --write "src/**/*.{ts,scss,html}"`
and check with `npx prettier --check "src/**/*.{ts,scss,html}"`.
