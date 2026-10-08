import fs from 'node:fs';
import path from 'node:path';

const assets = path.resolve(import.meta.dirname, '../../public/assets');
fs.mkdirSync(assets, { recursive: true });
for (const entry of fs.readdirSync(assets, { withFileTypes: true })) {
    if (entry.isFile() && /\.(js|map)$/.test(entry.name)) {
        fs.unlinkSync(path.join(assets, entry.name));
    }
}

const buildDir = path.resolve(import.meta.dirname, '../../public/build');
if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true, force: true });
}

const hotFile = path.resolve(import.meta.dirname, '../../public/hot');
if (fs.existsSync(hotFile)) {
    fs.unlinkSync(hotFile);
}

