# markdown-here-slim

## Build

```sh
pnpm install
pnpm run build
```

The build writes unpacked extensions and packaged archives under `dist/`:

- `dist/chrome/` and `dist/chrome.zip`
- `dist/firefox/` and `dist/firefox.zip`
- `dist/thunderbird/` and `dist/thunderbird.xpi`

## Installation

### Chrome

For local use, install the unpacked extension:

1. Build the extension with `pnpm run build`.
2. Open `chrome://extensions`.
3. Enable `Developer mode`.
4. Click `Load unpacked`.
5. Select the `dist/chrome/` directory.

`dist/chrome.zip` is the packaged archive. Chrome's local developer install flow
uses the unpacked directory, not the zip file.

### Firefox

For a temporary local install:

1. Build the extension with `pnpm run build`.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click `Load Temporary Add-on...`.
4. Select `dist/firefox/manifest.json` or `dist/firefox.zip`.

Temporary Firefox add-ons are removed when Firefox restarts. A persistent
install requires a signed package.

### Thunderbird

For local use:

1. Build the extension with `pnpm run build`.
2. Open Thunderbird's Add-ons Manager.
3. Choose `Install Add-on From File...`.
4. Select `dist/thunderbird.xpi`.

## License

Unless a file is marked otherwise in [`REUSE.toml`](REUSE.toml), this
project's files and modifications are distributed under `AGPL-3.0-or-later`.

Some files are derived from upstream Markdown Here or third-party projects and
keep their original copyright and license notices. Full license texts are stored
in [`LICENSES/`](LICENSES/). Upstream contributor and historical records are
preserved under [`docs/upstream/`](docs/upstream/) and summarized in
[`NOTICE.md`](NOTICE.md).

### Code

Original Markdown Here code remains subject to the upstream MIT License notice.
This project's modifications are licensed under `AGPL-3.0-or-later` unless
file-level REUSE metadata says otherwise.

### Logo

The extension logo and toolbar icon are based on OpenMoji `E25D` ("edit") by
Kai Wanschura / OpenMoji, licensed under `CC-BY-SA-4.0`.

The source SVG files are stored under [`assets/openmoji/`](assets/openmoji/).
Chrome PNG icons are generated from those SVGs during the build.
