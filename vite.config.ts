// SPDX-FileCopyrightText: 2026 KIM Hyunjae
// SPDX-License-Identifier: AGPL-3.0-or-later

import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, type PluginOption } from "vite";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const legacyExtensionRoot = path.join(projectRoot, "src", "legacy-extension");
const distRoot = path.join(projectRoot, "dist");

type ExtensionTarget = {
  name: string;
  manifest: string;
  output: string;
  excludeBackgroundPage: boolean;
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

function isExcludedExtensionFile(
  source: string,
  target: ExtensionTarget,
): boolean {
  const relativePath = path.relative(legacyExtensionRoot, source);

  return (
    (target.excludeBackgroundPage &&
      relativePath === path.join("chrome", "background.html")) ||
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
