#!/usr/bin/env bash

set -euo pipefail

npm run typecheck
npm test
npm run lint
npm run build

node ./bin/run.js auth login --help >/dev/null
node ./bin/run.js billing export --help >/dev/null
node ./bin/run.js config policy apply-preset --help >/dev/null

if [[ "${CLOCKODO_SMOKE_LIVE:-0}" == "1" ]]; then
  node ./bin/run.js auth status --offline >/dev/null
  node ./bin/run.js me --json >/dev/null
  node ./bin/run.js billing export --last-month --format bexio --json >/dev/null
fi
