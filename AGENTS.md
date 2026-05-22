<!--
SPDX-FileCopyrightText: 2026 KIM Hyunjae
SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Repository Instructions

## Legacy Extension Boundary

`src/legacy-extension` is reserved for upstream Markdown Here-derived files and modifications to those files.

Do not add new first-party source files under `src/legacy-extension`. Place new first-party extension code under `src/extension`. Write first-party extension code in TypeScript, and have the build step emit any JavaScript or packaged files needed in `dist`.

This boundary exists to keep upstream-derived code, project-specific code, and license metadata clear.

## Documentation

- Write all documentation in a concise, technical style.
- Use Mermaid for diagrams when diagrams are needed.
- Do not hard-wrap prose in Markdown files. Keep ordinary paragraphs and list items on a single source line unless Markdown syntax or structured blocks require line breaks.

## Commands

- Install dependencies: `pnpm install`.
- Run checks: `devenv tasks run ci:check`
- Format files: `devenv shell -- treefmt`
- Type-check: `pnpm run typecheck`.
- Build extensions: `pnpm run build`
- Clean build artifacts: `pnpm run clean`

## Commits

- Use Conventional Commits for all commit messages.
- Use a Conventional Commit scope when a clear scope exists.
