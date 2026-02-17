const fs = require('fs');
const files = [
  'main-backend-microservices/alpha-muvi-identity-main/package-lock.json',
  'main-backend-microservices/alpha-muvi-main-main/package-lock.json',
  'main-backend-microservices/alpha-muvi-payment-main/package-lock.json',
  'main-backend-microservices/alpha-muvi-fb-main/package-lock.json',
  'main-backend-microservices/alpha-muvi-notification-main/package-lock.json',
  'main-backend-microservices/alpha-muvi-gateway-main/package-lock.json'
];
files.forEach(f => {
  const data = JSON.parse(fs.readFileSync(f, 'utf8'));
  let count = 0;
  if (data.packages) {
    for (const [k, v] of Object.entries(data.packages)) {
      if (k.includes('@alpha.apps') && v.integrity) { delete v.integrity; count++; }
    }
  }
  if (data.dependencies) {
    for (const [k, v] of Object.entries(data.dependencies)) {
      if (k.includes('@alpha.apps') && v.integrity) { delete v.integrity; count++; }
    }
  }
  fs.writeFileSync(f, JSON.stringify(data, null, 2) + '\n');
  console.log(f + ' - removed ' + count + ' integrity hashes');
});
console.log('Done!');
