const fs = require('fs');
const files = [
  'main-backend-microservices/alpha-muvi-identity-main/package-lock.json',
  'main-backend-microservices/alpha-muvi-main-main/package-lock.json',
  'main-backend-microservices/alpha-muvi-payment-main/package-lock.json',
  'main-backend-microservices/alpha-muvi-fb-main/package-lock.json',
  'main-backend-microservices/alpha-muvi-notification-main/package-lock.json',
  'main-backend-microservices/alpha-muvi-gateway-main/package-lock.json'
];

const versions = {};

files.forEach(f => {
  const data = JSON.parse(fs.readFileSync(f, 'utf8'));
  
  // Check packages (lockfile v2)
  if (data.packages) {
    for (const [k, v] of Object.entries(data.packages)) {
      if (k.includes('@alpha.apps')) {
        const name = k.replace(/^node_modules\//, '');
        if (!versions[name]) versions[name] = new Set();
        if (v.version) versions[name].add(v.version);
      }
    }
  }
  
  // Check dependencies (lockfile v1)
  if (data.dependencies) {
    for (const [k, v] of Object.entries(data.dependencies)) {
      if (k.includes('@alpha.apps')) {
        if (!versions[k]) versions[k] = new Set();
        if (v.version) versions[k].add(v.version);
        // Check nested requires
        if (v.requires) {
          for (const [rk, rv] of Object.entries(v.requires)) {
            if (rk.includes('@alpha.apps')) {
              // version range, not exact
            }
          }
        }
        // Check nested dependencies
        if (v.dependencies) {
          for (const [dk, dv] of Object.entries(v.dependencies)) {
            if (dk.includes('@alpha.apps')) {
              if (!versions[dk]) versions[dk] = new Set();
              if (dv.version) versions[dk].add(dv.version);
            }
          }
        }
      }
    }
  }
});

for (const [name, versionSet] of Object.entries(versions)) {
  console.log(`${name}: ${[...versionSet].join(', ')}`);
}
