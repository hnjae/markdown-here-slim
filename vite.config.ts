// SPDX-FileCopyrightText: 2026 KIM Hyunjae
// SPDX-License-Identifier: AGPL-3.0-or-later

import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { defineConfig, type PluginOption } from "vite";

import {
  generateChromeOpenMojiIcons,
  generateOpenMojiThemeAssets,
} from "./scripts/generate-openmoji-icons.js";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const legacyExtensionRoot = path.join(projectRoot, "src", "legacy-extension");
const extensionSourceRoot = path.join(projectRoot, "src", "extension");
const openmojiRoot = path.join(projectRoot, "assets", "openmoji");
const distRoot = path.join(projectRoot, "dist");

type ExtensionTarget = {
  name: string;
  manifest: string;
  output: string;
  excludeBackgroundPage: boolean;
  excludePngIcons: boolean;
};

const extensionTargets: ExtensionTarget[] = [
  {
    name: "chrome",
    manifest: path.join(
      projectRoot,
      "src",
      "extension",
      "chrome",
      "manifest.json",
    ),
    output: path.join(distRoot, "chrome"),
    excludeBackgroundPage: true,
    excludePngIcons: false,
  },
  {
    name: "firefox",
    manifest: path.join(
      projectRoot,
      "src",
      "extension",
      "firefox",
      "manifest.json",
    ),
    output: path.join(distRoot, "firefox"),
    excludeBackgroundPage: false,
    excludePngIcons: true,
  },
  {
    name: "thunderbird",
    manifest: path.join(
      projectRoot,
      "src",
      "extension",
      "thunderbird",
      "manifest.json",
    ),
    output: path.join(distRoot, "thunderbird"),
    excludeBackgroundPage: false,
    excludePngIcons: true,
  },
];

const complianceEntries = [
  "LICENSE",
  "NOTICE.md",
  "README.md",
  "REUSE.toml",
  "LICENSES",
  path.join("docs", "upstream"),
];

const chromeThemeDetectorRoot = path.join(
  extensionSourceRoot,
  "chrome",
  "theme-detector",
);

function isExcludedExtensionFile(
  source: string,
  target: ExtensionTarget,
): boolean {
  const relativePath = path.relative(legacyExtensionRoot, source);

  return (
    (target.excludeBackgroundPage &&
      relativePath === path.join("chrome", "background.html")) ||
    (target.excludePngIcons &&
      path.dirname(relativePath) === path.join("common", "images") &&
      path.extname(relativePath) === ".png") ||
    relativePath.endsWith(".bts") ||
    relativePath.endsWith(".DS_Store") ||
    relativePath.endsWith("desktop.ini") ||
    relativePath.endsWith("Thumbs.db")
  );
}

function extensionCopyPlugin(): PluginOption {
  const virtualModuleId = "virtual:extension-build";
  const resolvedVirtualModuleId = `\0${virtualModuleId}`;

  return {
    name: "extension-copy",
    resolveId(id) {
      return id === virtualModuleId ? resolvedVirtualModuleId : null;
    },
    load(id) {
      return id === resolvedVirtualModuleId ? "export {};" : null;
    },
    generateBundle(_options, bundle) {
      for (const key of Object.keys(bundle)) {
        delete bundle[key];
      }
    },
    async writeBundle() {
      for (const target of extensionTargets) {
        await mkdir(target.output, { recursive: true });
        await cp(legacyExtensionRoot, target.output, {
          recursive: true,
          filter: (source) => !isExcludedExtensionFile(source, target),
        });
        await cp(target.manifest, path.join(target.output, "manifest.json"));
        await cp(
          openmojiRoot,
          path.join(target.output, "common", "images", "openmoji"),
          { recursive: true },
        );
        await generateOpenMojiThemeAssets(
          path.join(target.output, "common", "images"),
        );
        if (target.name === "chrome") {
          await buildChromeThemeDetector(target.output);
          await generateChromeOpenMojiIcons(
            path.join(target.output, "common", "images"),
          );
        }

        for (const entry of complianceEntries) {
          const source = path.join(projectRoot, entry);
          const destination = path.join(target.output, entry);
          await rm(destination, { recursive: true, force: true });
          await cp(source, destination, { recursive: true });
        }
      }
    },
  };
}

async function buildChromeThemeDetector(output: string): Promise<void> {
  const outputChromeRoot = path.join(output, "chrome");
  const sourceTs = path.join(chromeThemeDetectorRoot, "index.ts");
  const sourceHtml = path.join(chromeThemeDetectorRoot, "index.html");
  const outputJs = path.join(outputChromeRoot, "theme-detector.js");
  const outputHtml = path.join(outputChromeRoot, "theme-detector.html");

  const tsSource = await readFile(sourceTs, "utf8");
  const js = ts.transpileModule(tsSource, {
    compilerOptions: {
      module: ts.ModuleKind.None,
      target: ts.ScriptTarget.ES2024,
      removeComments: false,
    },
    fileName: sourceTs,
  }).outputText;

  await mkdir(outputChromeRoot, { recursive: true });
  await writeFile(outputJs, js);
  await cp(sourceHtml, outputHtml);
}

export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: distRoot,
    rollupOptions: {
      input: "virtual:extension-build",
    },
  },
  plugins: [extensionCopyPlugin()],
});
