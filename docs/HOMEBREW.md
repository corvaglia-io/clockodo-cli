# Homebrew

Clockodo CLI is installable with Homebrew through the `corvaglia-io/homebrew-tap` tap.

Current layout:

- app repo: `corvaglia-io/clockodo-cli`
- tap repo: `corvaglia-io/homebrew-tap`
- user install command: `brew install corvaglia-io/tap/clockodo-cli`

Current public release example:

- release tag: `v0.1.0`
- release asset: `clockodo-cli-0.1.0.tgz`
- formula path in tap repo: `Formula/clockodo-cli.rb`

## Install

Install the CLI with:

```bash
brew install corvaglia-io/tap/clockodo-cli
```

Then verify:

```bash
clockodo --help
```

## Release Workflow

For every new Homebrew release, use this sequence:

1. Bump the version in `package.json`.
2. Commit and push the application repo changes.
3. Create the npm-style release tarball:

```bash
bash scripts/pack-release.sh
```

4. Copy the printed SHA-256 checksum.
5. Create a GitHub release in `corvaglia-io/clockodo-cli` with a matching tag such as `v0.1.1`.
6. Upload the generated tarball asset, for example `clockodo-cli-0.1.1.tgz`.
7. Generate the updated formula:

```bash
node scripts/generate-homebrew-formula.mjs \
  --sha256 YOUR_SHA256 \
  --out ./clockodo-cli.rb
```

8. Copy that formula into the tap repo at `Formula/clockodo-cli.rb`.
9. Commit and push the tap repo.
10. Smoke test the published formula:

```bash
brew update
brew reinstall corvaglia-io/tap/clockodo-cli
clockodo --help
```

## Release Artifact

The Homebrew formula should install from an npm-style release tarball, not from the raw GitHub source archive.

That matters because:

- this repo does not track `dist/`
- `npm pack` includes the built CLI files from `dist/`
- Homebrew can then install the tarball with `npm install`

Create the release tarball with:

```bash
bash scripts/pack-release.sh
```

By default the script writes the tarball to `./release/` and prints the SHA-256 checksum you need for the formula.

Example output file:

```text
release/clockodo-cli-0.1.0.tgz
```

The script prints the SHA-256 checksum needed by the formula.

## GitHub Release

Create a GitHub release that matches the package version tag, for example:

```text
v0.1.0
```

Upload the generated tarball as a release asset:

```text
clockodo-cli-0.1.0.tgz
```

The default formula generator assumes this asset URL shape:

```text
https://github.com/corvaglia-io/clockodo-cli/releases/download/v0.1.0/clockodo-cli-0.1.0.tgz
```

## Generate The Formula

Once you have the tarball SHA-256, generate the formula with:

```bash
node scripts/generate-homebrew-formula.mjs \
  --sha256 YOUR_SHA256 \
  --out ./clockodo-cli.rb
```

If needed, you can override the asset URL:

```bash
node scripts/generate-homebrew-formula.mjs \
  --sha256 YOUR_SHA256 \
  --url https://example.invalid/clockodo-cli-0.1.0.tgz \
  --out ./clockodo-cli.rb
```

The generated formula installs with:

- `depends_on "node"`
- `system "npm", "install", *std_npm_args`
- symlinks the packaged CLI binary into Homebrew `bin`

If you are already inside the tap repo locally, you can write directly to the final formula path:

```bash
node /path/to/clockodo-cli/scripts/generate-homebrew-formula.mjs \
  --sha256 YOUR_SHA256 \
  --out ./Formula/clockodo-cli.rb
```

## Tap Repo

The tap repository already exists:

```text
corvaglia-io/homebrew-tap
```

Inside that repo, keep the generated formula at:

```text
Formula/clockodo-cli.rb
```

The tap repo should only contain lightweight Homebrew-maintenance files such as:

- `Formula/clockodo-cli.rb`
- `README.md`

## User Install

After the tap repo and release asset both exist, users can install with:

```bash
brew install corvaglia-io/tap/clockodo-cli
```

## Local Smoke Check

Before publishing the formula, you can at least verify the packaged artifact locally:

```bash
bash scripts/pack-release.sh
tar -tzf release/clockodo-cli-0.1.0.tgz | head
```

That should show an npm package tarball containing `package/`, `package/bin/`, and `package/dist/`.

## Notes

- Homebrew installs from the release tarball, not from the raw GitHub source archive.
- Because `dist/` is not tracked in git, the release tarball is the supported artifact for Homebrew.
- The formula checksum must match the exact uploaded tarball asset for the matching release tag.
