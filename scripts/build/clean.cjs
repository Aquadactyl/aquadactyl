const fs = require('node:fs');
const path = require('node:path');

const assets = path.resolve(__dirname, '../../public/assets');
fs.mkdirSync(assets, { recursive: true });
for (const entry of fs.readdirSync(assets, { withFileTypes: true })) {
    if (entry.isFile() && /\.(js|map)$/.test(entry.name)) {
        fs.unlinkSync(path.join(assets, entry.name));
    }
}
