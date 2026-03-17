# Homebrew

Clockodo CLI is not installable with Homebrew yet from this repo alone because a Homebrew tap is a separate repository.

The recommended layout is:

- app repo: `corvaglia-io/clockodo-cli`
- tap repo: `corvaglia-io/homebrew-tap`
- user install command: `brew install corvaglia-io/tap/clockodo-cli`

This repo now contains the pieces needed to support that flow.

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

## Tap Repo

Create a separate repository:

```text
corvaglia-io/homebrew-tap
```

Inside that repo, place the generated formula at:

```text
Formula/clockodo-cli.rb
```

You can either copy the generated `./clockodo-cli.rb` file into that path or write there directly if you run the generator with an output path inside the tap repo.

Then commit and push it.

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
