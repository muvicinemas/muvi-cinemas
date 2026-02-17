/**
 * Publishes all needed versions of @alpha.apps/* packages to Verdaccio.
 * Since we only have one version of each package's source code, we republish
 * the same code under all version numbers referenced in the lockfiles.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REGISTRY = 'http://localhost:4873';
const USERCONFIG = path.resolve(__dirname, '.npmrc-verdaccio');

// Map of package name -> source dir (relative to workspace root)
const packages = {
  '@alpha.apps/muvi-proto':        '_packages-source/@alpha.apps/muvi-proto',
  '@alpha.apps/muvi-shared':       '_packages-source/@alpha.apps/muvi-shared',
  '@alpha.apps/nestjs-common':     '_packages-source/@alpha.apps/nestjs-common',
  '@alpha.apps/muvi-identity-sdk': '_packages-source/Proto/identity',
  '@alpha.apps/muvi-payment-sdk':  '_packages-source/Proto/payment-sdk',
  '@alpha.apps/muvi-main-sdk':     '_packages-source/Proto/main-sdk',
  '@alpha.apps/muvi-fb-sdk':       '_packages-source/Proto/fb-sdk',
};

// Versions already published
const published = {
  '@alpha.apps/muvi-proto':        ['1.20.1'],
  '@alpha.apps/muvi-shared':       ['1.20.1'],
  '@alpha.apps/nestjs-common':     ['1.1.15'],
  '@alpha.apps/muvi-identity-sdk': ['1.20.0'],
  '@alpha.apps/muvi-payment-sdk':  ['1.20.0'],
  '@alpha.apps/muvi-main-sdk':     ['1.20.0-uat'],
  '@alpha.apps/muvi-fb-sdk':       ['1.20.0'],
};

// Additional versions needed (from lockfile analysis)
const needed = {
  '@alpha.apps/muvi-proto':        ['1.20.0', '1.20.2', '1.19.1', '1.18.9-uat'],
  '@alpha.apps/muvi-shared':       ['1.13.0', '1.20.0', '1.13.1'],
  '@alpha.apps/nestjs-common':     ['1.1.11'],
  '@alpha.apps/muvi-identity-sdk': ['1.17.1'],
  '@alpha.apps/muvi-payment-sdk':  ['1.19.1'],
  '@alpha.apps/muvi-main-sdk':     ['1.19.1', '1.20.0'],
  '@alpha.apps/muvi-fb-sdk':       [],
};

let successCount = 0;
let failCount = 0;

for (const [pkgName, versions] of Object.entries(needed)) {
  if (versions.length === 0) continue;
  
  const srcDir = path.resolve(__dirname, packages[pkgName]);
  const pkgJsonPath = path.join(srcDir, 'package.json');
  const originalContent = fs.readFileSync(pkgJsonPath, 'utf8');
  const pkg = JSON.parse(originalContent);
  
  for (const version of versions) {
    console.log(`Publishing ${pkgName}@${version}...`);
    
    // Temporarily change version
    pkg.version = version;
    fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n');
    
    try {
      execSync(
        `npm publish --ignore-scripts --registry ${REGISTRY} --userconfig "${USERCONFIG}"`,
        { cwd: srcDir, stdio: 'pipe', timeout: 30000 }
      );
      console.log(`  ✓ ${pkgName}@${version}`);
      successCount++;
    } catch (err) {
      const stderr = err.stderr ? err.stderr.toString() : '';
      if (stderr.includes('already been published')) {
        console.log(`  ~ ${pkgName}@${version} (already exists)`);
        successCount++;
      } else {
        console.log(`  ✗ ${pkgName}@${version}: ${stderr.substring(0, 200)}`);
        failCount++;
      }
    }
  }
  
  // Restore original package.json
  fs.writeFileSync(pkgJsonPath, originalContent);
}

console.log(`\nDone! ${successCount} published, ${failCount} failed.`);
