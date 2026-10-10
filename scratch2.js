const importMap = {"imports":{"cc":"./../cocos-js/cc.js"}};
const basePath = "src/";
for (const key in importMap.imports) {
    let val = importMap.imports[key];
    // resolve val relative to basePath
    // e.g. "src/" and "./../cocos-js/cc.js"
    if (val.startsWith('./')) val = val.substring(2);
    // basic resolution
    const parts = basePath.split('/').filter(Boolean);
    const valParts = val.split('/');
    for (const p of valParts) {
        if (p === '..') parts.pop();
        else if (p !== '.') parts.push(p);
    }
    importMap.imports[key] = './' + parts.join('/');
}
console.log(importMap);
