// Baixa o areas.json do brabo-contracts NA TAG fixada (a mesma do @brabo/shared).
import { mkdirSync, writeFileSync } from 'node:fs';
const TAG = 'v1.0.0';
const url = `https://raw.githubusercontent.com/viralabs-dev/brabo-contracts/${TAG}/packages/contracts/areas.json`;
const r = await fetch(url);
if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
mkdirSync('.contracts', { recursive: true });
writeFileSync('.contracts/areas.json', await r.text());
console.log(`areas.json @ ${TAG} baixado`);
