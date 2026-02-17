# packages/README.md
# @alpha.apps Package Source Code
#
# This directory contains the reconstructed TypeScript source for the two
# @alpha.apps packages whose original source code was NOT available anywhere
# in the repos:
#
#   packages/muvi-shared/      → @alpha.apps/muvi-shared v1.20.0
#   packages/nestjs-common/    → @alpha.apps/nestjs-common v1.1.15
#
# These were reverse-engineered from compiled JavaScript + .d.ts type
# declarations extracted from the running Docker containers. The code
# compiles cleanly with zero TypeScript errors.
#
# ─── Other Package Sources (already in the service repos) ───
#
#   @alpha.apps/muvi-identity-sdk  → alpha-muvi-identity-main/libs/identity-sdk/
#   @alpha.apps/muvi-main-sdk      → alpha-muvi-main-main/libs/main-sdk/
#   @alpha.apps/muvi-payment-sdk   → alpha-muvi-payment-main/libs/payment-sdk/
#   @alpha.apps/muvi-fb-sdk        → alpha-muvi-fb-main/libs/fb-sdk/
#   @alpha.apps/muvi-proto         → Proto/ (full .proto + generated .ts ship inside the npm pkg)
#
# ─── Workflow: Modify → Build → Publish → Use ───
#
#   1. Edit TypeScript source in packages/<name>/src/
#   2. Bump version in packages/<name>/package.json
#   3. Build:   cd packages/<name> && npm run build
#   4. Publish: npm publish --registry http://localhost:4873
#   5. In the consuming service: npm install @alpha.apps/<name>@<new-version>
#   6. Rebuild that service's Docker image
#
# For a one-command build+publish, use: .\muvi-up.ps1 publish
