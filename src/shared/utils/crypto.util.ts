import crypto from 'crypto';

// En producción, esta clave debería venir de una variable de entorno
// Debe ser de 32 bytes para AES-256
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'v0v8y9z1a2b3c4d5e6f7g8h9i0j1k2l3';
const IV_LENGTH = 16; // Para AES, siempre es 16

export const encrypt = (text: string): string => {
    if (!text) return text;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

export const decrypt = (text: string): string => {
    if (!text) return text;
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift()!, 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (error) {
        // Si falla la desencriptación (por ejemplo, si el texto no estaba encriptado o la clave cambió),
        // devolvemos el texto original por si acaso es una contraseña antigua no encriptada.
        return text;
    }
};
