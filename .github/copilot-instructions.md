## High-level summary

- What: A small single-page Angular web application for cropping photos into a square format and preserving selected EXIF metadata.
- Purpose: Fast local cropping tool for preparing images for upload to iNaturalist.
- Tech: Angular, TypeScript, SCSS, Angular Material. Node/npm-based frontend build.
- Size: small-to-medium (single Angular app in `src/`, no backend code present).

## Quick facts (commands you will need)

- Install: `npm ci` (preferred for CI-like reproducible install) or `npm i`.
- Dev server: `npm start` (runs `ng serve`, opens at `http://localhost:4200`).
- Build (prod): `npm run build:prod` (sets `--configuration=production` and `--base-href=/inat-editor/`).
- Build (default): `npm run build` (uses Angular default configuration; project `angular.json` sets production as default).
- Lint: `npm run lint` (uses `@angular-eslint`).
- Format: `npm run format` (runs Prettier).

## Project layout & important files

- `angular.json` — main Angular CLI project config (sourceRoot: `src`, outputPath: `dist/inat-editor`).
- `package.json` — scripts, dependencies, and devDependencies (Angular libs, `typescript`, `@angular/cli`).
- `tsconfig.app.json`, `tsconfig.json` — TypeScript config.
- `src/` — application source; main entry `src/main.ts`, `src/index.html`.
- `src/app/` — Angular components (e.g., `image-editor`, `file-list`, `folder-selector`, `info-bar`), shared utilities in `src/app/utils/`.
- `src/assets/` — static assets.
- `types/` — third-party types (`piexifjs` has a declaration here).
- `.github/workflows/main.yaml` — CI workflow (build + deploy). Note: workflow uses Node 20 and runs `npm install && npm run build:prod` then a deploy step.

## Common pitfalls and guidance

- The project declares `allowedCommonJsDependencies: ["piexifjs"]` in `angular.json`. If you add new CommonJS packages, add them there or convert to ESM to avoid runtime warnings/failures.
- There are no automated unit tests in the repo; rely on build and lint steps for validation.

## Cropping details

- Cropped area is aways a square (width = height).
- The size of the cropped image must never exceed 2048px in either dimension.
- If the selected crop area is larger, it is scaled down proportionally.

## EXIF details

- The app uses the `piexifjs` library to read and write EXIF metadata.
- Only a subset of EXIF tags are preserved, see `src/app/utils/exif.util.ts` for the list.

## Access to photos

- The app uses the File System Access API to allow users to select folders and read/write files directly.
- This API is only supported in Chromium-based browsers (e.g., Chrome, Edge).
