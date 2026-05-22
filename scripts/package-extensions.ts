// SPDX-FileCopyrightText: 2026 KIM Hyunjae
// SPDX-License-Identifier: AGPL-3.0-or-later

import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import archiver from "archiver";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distRoot = path.join(projectRoot, "dist");

await mkdir(distRoot, { recursive: true });

async function packageExtension(
  targetName: string,
  archiveExtension = "zip",
): Promise<void> {
  const targetOutput = path.join(distRoot, targetName);
  const targetZip = path.join(distRoot, `${targetName}.${archiveExtension}`);

  const output = createWriteStream(targetZip);
  const archive = archiver("zip", { zlib: { level: 9 } });

  const result = new Promise<void>((resolve, reject) => {
    output.on("close", resolve);
    output.on("error", reject);
    archive.on("error", reject);
  });

  archive.pipe(output);
  archive.directory(targetOutput, false);
  await archive.finalize();
  await result;

  console.log(`Built ${path.relative(projectRoot, targetZip)}`);
}

await packageExtension("chrome");
await packageExtension("firefox", "xpi");
await packageExtension("thunderbird", "xpi");
