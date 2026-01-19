const bcrypt = require('bcryptjs');

async function generate() {
    const pass = '123456';
    const hash = await bcrypt.hash(pass, 10);
    console.log(`Password: ${pass}`);
    console.log(`Hash: ${hash}`);
}

generate();
