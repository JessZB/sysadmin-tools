const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../src/views');
const dest = path.join(__dirname, '../dist/views');

function copyRecursiveSync(src, dest) {
    if (!fs.existsSync(src)) return;

    const stats = fs.statSync(src);
    const isDirectory = stats.isDirectory();

    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        fs.readdirSync(src).forEach(function(childItemName) {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        const destDir = path.dirname(dest);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(src, dest);
    }
}

try {
    console.log(`Copying views from ${src} to ${dest}...`);
    copyRecursiveSync(src, dest);
    console.log('Views copied successfully.');
} catch (err) {
    console.error('Error copying views:', err);
    process.exit(1);
}
