/**
 * Bump the app version in package.json (Docker tags and in-app UI read from here).
 *
 * Usage:
 *   bun run scripts/bump-version.ts patch|minor|major
 *   bun run scripts/bump-version.ts 1.2.3
 *
 * Options:
 *   --dry-run   Print the new version only; do not write package.json
 *   --git       Stage package.json, commit "chore: release vX.Y.Z", tag vX.Y.Z (run from repo root)
 */

import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dir, "..");
const PACKAGE_JSON = path.join(REPO_ROOT, "package.json");

type BumpKind = "patch" | "minor" | "major";

function usage(): never {
  console.error(`Usage:
  bun run scripts/bump-version.ts <patch|minor|major>
  bun run scripts/bump-version.ts <x.y.z>

Options:
  --dry-run   Show target version without changing files
  --git       git add package.json, commit, and create tag vX.Y.Z
  --push      push the changes to the remote repository
`);
  process.exit(1);
}

function parseSemverParts(input: string): [number, number, number] | null {
  const cleaned = input.trim().replace(/^v/i, "");
  const base = cleaned.split(/[-+]/)[0] ?? "";
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(base);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function formatSemver(parts: [number, number, number]): string {
  return `${parts[0]}.${parts[1]}.${parts[2]}`;
}

function bump(parts: [number, number, number], kind: BumpKind): string {
  const [maj, min, pat] = parts;
  if (kind === "patch") return formatSemver([maj, min, pat + 1]);
  if (kind === "minor") return formatSemver([maj, min + 1, 0]);
  return formatSemver([maj + 1, 0, 0]);
}

function parseArgs(argv: string[]) {
  let dryRun = false;
  let git = false;
  let push = false;
  const pos: string[] = [];
  for (const a of argv) {
    if (a === "--dry-run") dryRun = true;
    else if (a === "--git") git = true;
    else if (a === "--push") push = true;
    else if (a.startsWith("-")) {
      console.error(`Unknown option: ${a}`);
      usage();
    } else pos.push(a);
  }
  return { dryRun, git, pos };
}

async function main() {
  const { dryRun, git, push, pos } = parseArgs(process.argv.slice(2));
  if (pos.length !== 1) usage();

  const arg = pos[0]!;
  const raw = await Bun.file(PACKAGE_JSON).text();
  const pkg = JSON.parse(raw) as { version?: string };
  const current = pkg.version;
  if (!current || typeof current !== "string") {
    console.error('package.json has no string "version" field.');
    process.exit(1);
  }

  const currentParts = parseSemverParts(current);
  if (!currentParts) {
    console.error(`Current version is not semver x.y.z: ${current}`);
    process.exit(1);
  }

  let next: string;
  if (arg === "patch" || arg === "minor" || arg === "major") {
    next = bump(currentParts, arg);
  } else {
    const explicit = parseSemverParts(arg);
    if (!explicit) {
      console.error(
        `Not a valid semver x.y.z or bump kind: ${arg}. Use patch, minor, major, or e.g. 1.2.3.`,
      );
      process.exit(1);
    }
    next = formatSemver(explicit);
    if (next === current) {
      console.error(`Version is already ${current}.`);
      process.exit(1);
    }
  }

  console.log(`${current} → ${next}`);

  if (dryRun) {
    console.log("--dry-run: package.json not modified.");
    process.exit(0);
  }

  const tag = `v${next}`;
  pkg.version = next;
  await Bun.write(PACKAGE_JSON, `${JSON.stringify(pkg, null, 2)}\n`);

  if (git) {
    const msg = `chore: release ${tag}`;
    const run = (cmd: string[], label: string) => {
      const r = Bun.spawnSync({
        cmd,
        cwd: REPO_ROOT,
        stdout: "inherit",
        stderr: "inherit",
      });
      if (r.exitCode !== 0) {
        console.error(`git step failed: ${label}`);
        process.exit(r.exitCode ?? 1);
      }
    };
    run(["git", "add", "package.json"], "git add");
    run(["git", "commit", "-m", msg], "git commit");
    run(["git", "tag", tag], `git tag ${tag}`);
    if (push) {
      run(["git", "push"], "git push");
      run(["git", "push", "origin", tag], `git push origin ${tag}`);
    } else {
      console.log(
        `Committed and tagged ${tag}. Push with: git push && git push origin ${tag}`,
      );
    }
  }
}

main();
