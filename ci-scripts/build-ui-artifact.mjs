#!/usr/bin/env node
/**
 * Passbolt ~ Open source password manager for teams
 * Copyright (c) Passbolt SA (https://www.passbolt.com)
 *
 * Licensed under GNU Affero General Public License version 3 of the or any later version.
 * For full copyright and license information, please see the LICENSE.txt
 * Redistributions of files must retain the above copyright notice.
 *
 * @copyright     Copyright (c) Passbolt SA (https://www.passbolt.com)
 * @license       https://opensource.org/licenses/AGPL-3.0 AGPL License
 * @link          https://www.passbolt.com Passbolt(tm)
 */
import {execFileSync, spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {fileURLToPath} from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_REPOSITORY = "https://github.com/Type-Delta/passbolt_styleguide.git";

const parseArgs = (argv) => {
  const options = {
    out: path.join(ROOT, "dist"),
    requireClean: false,
    requirePinnedToolchain: false,
    repository: DEFAULT_REPOSITORY,
  };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--out") {
      options.out = argv[++index];
    } else if (arg.startsWith("--out=")) {
      options.out = arg.slice("--out=".length);
    } else if (arg === "--repository") {
      options.repository = argv[++index];
    } else if (arg.startsWith("--repository=")) {
      options.repository = arg.slice("--repository=".length);
    } else if (arg === "--require-clean") {
      options.requireClean = true;
    } else if (arg === "--require-pinned-toolchain") {
      options.requirePinnedToolchain = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: npm run pack:fork -- [--out DIR] [--require-clean] [--require-pinned-toolchain] [--repository URL]",
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.out) {
    throw new Error("--out requires a directory");
  }

  return options;
};

const git = (...args) => execFileSync("git", args, {cwd: ROOT, encoding: "utf8"}).trim();
const sha256 = (filePath) => createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
const sri = (filePath) => `sha512-${createHash("sha512").update(fs.readFileSync(filePath)).digest("base64")}`;

const assertClean = (treeState) => {
  if (treeState) {
    throw new Error(`The styleguide source tree is not clean. Commit or stow these changes first:\n${treeState}`);
  }
};

const requiredArtifacts = [
  "build/js/dist/api-app.js",
  "build/js/dist/api-vendors.js",
  "build/css/themes/default/api_main.min.css",
  "build/css/themes/default/api_authentication.min.css",
  "build/css/themes/default/ext_authentication.min.css",
  "build/locales/en-UK/common.json",
];

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    ...options,
  });

  if (result.status !== 0) {
    if (options.capture) {
      process.stderr.write(result.stdout || "");
      process.stderr.write(result.stderr || "");
    }
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }

  return result.stdout;
};

const options = parseArgs(process.argv.slice(2));
const expectedNode = "v22.14.0";
const expectedNpm = "10.9.2";
const actualNpm = execFileSync("npm", ["--version"], {encoding: "utf8"}).trim();
if (
  options.requirePinnedToolchain &&
  (process.version !== expectedNode || actualNpm !== expectedNpm)
) {
  throw new Error(
    `This artifact must be built with Node ${expectedNode} and npm ${expectedNpm}; found Node ${process.version} and npm ${actualNpm}`,
  );
}
const initialTreeState = git("status", "--porcelain");
if (options.requireClean) {
  assertClean(initialTreeState);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const source = {
  repository: options.repository,
  commit: git("rev-parse", "HEAD"),
  ref: git("rev-parse", "--abbrev-ref", "HEAD"),
  committedAt: git("show", "-s", "--format=%cI", "HEAD"),
};
const sourceDateEpoch = process.env.SOURCE_DATE_EPOCH || git("show", "-s", "--format=%ct", "HEAD");

console.log(`[ui-artifact] Building ${packageJson.name}@${packageJson.version} from ${source.commit}`);
run("npm", ["run", "build"], {env: {...process.env, SOURCE_DATE_EPOCH: sourceDateEpoch}});

for (const relativePath of requiredArtifacts) {
  if (!fs.existsSync(path.join(ROOT, relativePath))) {
    throw new Error(`Expected styleguide build artifact is missing: ${relativePath}`);
  }
}

const finalTreeState = git("status", "--porcelain");
if (options.requireClean) {
  assertClean(finalTreeState);
}

const outDir = path.resolve(ROOT, options.out);
fs.mkdirSync(outDir, {recursive: true});

const packOutput = run("npm", ["pack", "--silent", "--pack-destination", outDir, "--json"], {capture: true});
const packResult = JSON.parse(packOutput);
if (!Array.isArray(packResult) || packResult.length !== 1) {
  throw new Error(`Unexpected npm pack output: ${packOutput}`);
}

const packed = packResult[0];
const finalName = `passbolt-styleguide-${packageJson.version}-fork.tgz`;
const packedPath = path.join(outDir, packed.filename);
const finalPath = path.join(outDir, finalName);
if (packedPath !== finalPath) {
  fs.copyFileSync(packedPath, finalPath);
  fs.rmSync(packedPath);
}

const manifest = {
  schemaVersion: 1,
  name: packageJson.name,
  version: packageJson.version,
  license: packageJson.license,
  source: {
    ...source,
    dirty: finalTreeState.length > 0,
    dirtyStatus: finalTreeState ? finalTreeState.split("\n") : [],
  },
  tarball: {
    file: finalName,
    sha256: sha256(finalPath),
    integrity: sri(finalPath),
    bytes: fs.statSync(finalPath).size,
  },
  build: {
    sourceDateEpoch,
    requiredArtifacts,
    nodeVersion: process.version,
    npmVersion: actualNpm,
  },
};

const manifestPath = path.join(outDir, "passbolt-styleguide-artifact.json");
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`[ui-artifact] Wrote ${finalPath}`);
console.log(`[ui-artifact] Wrote ${manifestPath}`);
console.log(`[ui-artifact] sha256=${manifest.tarball.sha256}`);
console.log(`[ui-artifact] dirty=${manifest.source.dirty}`);
