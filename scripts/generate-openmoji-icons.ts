// SPDX-FileCopyrightText: 2026 KIM Hyunjae
// SPDX-License-Identifier: AGPL-3.0-or-later

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const openmojiRoot = path.join(projectRoot, "assets", "openmoji");
const defaultImageRoot = path.join(
  projectRoot,
  "dist",
  "chrome",
  "common",
  "images",
);
const colorSvg = path.join(openmojiRoot, "color", "svg", "E25D.svg");
const blackSvg = path.join(openmojiRoot, "black", "svg", "E25D.svg");

const appIconSizes = [16, 32, 48, 128, 512] as const;
const actionIconSizes = [16, 19, 32, 38, 64] as const;

function lightSvg(imageRoot: string): string {
  return path.join(imageRoot, "openmoji", "generated", "E25D-light.svg");
}

export async function renderSvgToPng(
  source: string,
  destination: string,
  size: number,
): Promise<void> {
  await sharp(source, { density: 1024 })
    .resize(size, size, { fit: "contain" })
    .png()
    .toFile(destination);
}

export async function generateChromeOpenMojiIcons(
  imageRoot = defaultImageRoot,
): Promise<void> {
  await generateOpenMojiThemeAssets(imageRoot);
  await mkdir(imageRoot, { recursive: true });

  for (const size of appIconSizes) {
    await renderSvgToPng(
      colorSvg,
      path.join(imageRoot, `icon${size}.png`),
      size,
    );
  }

  for (const size of actionIconSizes) {
    await renderSvgToPng(
      blackSvg,
      path.join(imageRoot, `icon${size}-button-monochrome.png`),
      size,
    );
    await renderSvgToPng(
      lightSvg(imageRoot),
      path.join(imageRoot, `icon${size}-button-light.png`),
      size,
    );
  }
}

export async function generateOpenMojiThemeAssets(
  imageRoot = defaultImageRoot,
): Promise<void> {
  const generatedRoot = path.join(imageRoot, "openmoji", "generated");
  await mkdir(generatedRoot, { recursive: true });

  const blackSvgContent = await readFile(blackSvg, "utf8");
  await writeFile(
    path.join(generatedRoot, "E25D-light.svg"),
    blackSvgContent.replaceAll("#000000", "#FFFFFF"),
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const imageRoot = process.argv[2] ? path.resolve(process.argv[2]) : undefined;
  await generateOpenMojiThemeAssets(imageRoot);
  await generateChromeOpenMojiIcons(imageRoot);
}
