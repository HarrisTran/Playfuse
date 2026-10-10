const fs = require('fs');
const jsCode = `console.log("Hello /world/");`;
const base64 = Buffer.from(jsCode, 'utf-8').toString('base64');
const binStr = atob(base64);
const bytes = new Uint8Array(binStr.length);
for (let i = 0; i < binStr.length; i++) {
    bytes[i] = binStr.charCodeAt(i);
}
const code = new TextDecoder().decode(bytes);
console.log(code === jsCode);
