// Extracts the inline pricing engine from a single-file calculator page.
// Usage: node extract-engine.cjs <input.html> <output.js>
const fs = require("fs");

const [, , inFile, outFile] = process.argv;
const html = fs.readFileSync(inFile, "utf8");

const start = html.indexOf("<script>// ===== Pricing engine");
if (start < 0) throw new Error("engine start marker not found");
const bodyStart = start + "<script>".length;
const end = html.indexOf("</script>", bodyStart);
let code = html.slice(bodyStart, end);

// Cut everything from the DOM layer onwards; keep only the pure engine.
const cut = code.indexOf("const $=");
code = cut > 0 ? code.slice(0, cut) : code;

code += "\nmodule.exports = { estimate, CFG, TIERS, COMPLEX, SHARE };\n";
fs.writeFileSync(outFile, code);
console.log("wrote", outFile, code.length, "bytes");
