const code = "console.log('hi');";
const b64 = Buffer.from(code).toString('base64');
const dataURI = 'data:application/javascript;base64,' + b64;
fetch(dataURI).then(r => r.text()).then(c => console.log(c === code));
