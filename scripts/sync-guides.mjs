import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const defaultSource = path.resolve(repoRoot, "..", "WIP-Dark-RP", "guides");
const sourceDirectory = path.resolve(
  process.env.OG_DARK_RP_GUIDES_SOURCE ?? defaultSource,
);
const targetDirectory = path.join(repoRoot, "content", "guides");
const sourceLabel = process.env.OG_DARK_RP_GUIDES_SOURCE
  ? sourceDirectory
  : "../WIP-Dark-RP/guides";
const shouldPrune = process.argv.includes("--prune");

if (!fs.existsSync(sourceDirectory)) {
  throw new Error(
    `Guide source folder not found: ${sourceDirectory}. Set OG_DARK_RP_GUIDES_SOURCE to override it.`,
  );
}

const sourceFiles = fs
  .readdirSync(sourceDirectory)
  .filter((fileName) => fileName.endsWith(".md"))
  .sort((a, b) => a.localeCompare(b));

if (sourceFiles.length === 0) {
  throw new Error(`No markdown guide files found in ${sourceDirectory}.`);
}

fs.mkdirSync(targetDirectory, { recursive: true });

if (shouldPrune) {
  const sourceSet = new Set(sourceFiles);
  for (const fileName of fs.readdirSync(targetDirectory)) {
    if (fileName.endsWith(".md") && !sourceSet.has(fileName)) {
      fs.unlinkSync(path.join(targetDirectory, fileName));
    }
  }
}

for (const fileName of sourceFiles) {
  fs.copyFileSync(
    path.join(sourceDirectory, fileName),
    path.join(targetDirectory, fileName),
  );
}

const manifest = {
  source: sourceLabel,
  target: "content/guides",
  generatedAt: new Date().toISOString(),
  files: sourceFiles,
};

fs.writeFileSync(
  path.join(targetDirectory, "generated-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log(
  `Synced ${sourceFiles.length} guide markdown files from ${sourceDirectory} to ${targetDirectory}.`,
);
