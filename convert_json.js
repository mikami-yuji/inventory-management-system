const fs = require('fs');
const path = require('path');

const inputPath = 'c:\\Users\\asahi\\.gemini\\antigravity\\playground\\sonic-perihelion\\delivery_addresses.json';
const outputPath = 'c:\\Users\\asahi\\.gemini\\antigravity\\playground\\sonic-perihelion\\delivery_addresses_utf8.json';

try {
    const buffer = fs.readFileSync(inputPath);
    // UTF-16LE is the common "Unicode" encoding on Windows
    const content = buffer.toString('utf16le');
    fs.writeFileSync(outputPath, content, 'utf8');
    console.log('Successfully converted to UTF-8');
} catch (err) {
    console.error('Error during conversion:', err);
}
