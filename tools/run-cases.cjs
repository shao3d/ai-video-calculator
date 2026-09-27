// Runs a set of fixed calculator states through a pricing engine and prints JSON.
// Usage: node run-cases.cjs <engine.js>
const path = require("path");
const engine = require(path.resolve(process.argv[2]));
const { estimate } = engine;

const DEF = {
  purpose: "ad", duration: 30, tier: "commerce", res: "1080", script: "idea", scenes: 3,
  hybrid: "none", shootDays: 1, faceStudio: true, animStyle: "ours",
  characters: 1, locations: 2, costumes: 0, approval: "key", complex: [], share: "few",
  music: "stock", sound: "basic", voice: "none", titles: "simple", subs: false,
  usage: "web", rush: "normal", formats: 0, langs: 0, revisions: 2
};
const S = (o) => Object.assign({}, DEF, o);

const CASES = {
  "A-defaults": S({}),
  "B-cinema-4k-complex": S({
    purpose: "brand", duration: 120, tier: "cinema", res: "4k", script: "none", scenes: 20,
    characters: 4, locations: 6, costumes: 6, approval: "full",
    complex: ["consistency", "dialogue", "product"], share: "most",
    music: "composer", sound: "full", voice: "actor", titles: "motion", subs: true,
    usage: "tv", rush: "urgent", formats: 2, langs: 1, revisions: 3
  }),
  "C-ip-preset": S({
    purpose: "ip", duration: 900, tier: "cinema", res: "1080", script: "idea", scenes: 40,
    characters: 10, locations: 10, costumes: 12, approval: "key",
    complex: ["consistency", "worlds"], share: "half",
    music: "composer", sound: "full", voice: "actor", titles: "motion"
  }),
  "D-facecap": S({
    purpose: "clip", duration: 180, tier: "cinema", res: "4k_up", script: "treatment", scenes: 12,
    hybrid: "facecap", shootDays: 2, faceStudio: true,
    characters: 2, locations: 4, costumes: 4, approval: "key",
    complex: ["dialogue", "motion"], share: "most", music: "composer", sound: "full", voice: "none"
  }),
  "E-shoot": S({
    purpose: "ad", duration: 45, tier: "commerce", res: "1080", script: "ready", scenes: 5,
    hybrid: "shoot", shootDays: 2, characters: 2, locations: 3, costumes: 2,
    complex: ["product"], share: "few", music: "ai", sound: "basic", voice: "ai"
  }),
  "F-render-cgi": S({
    purpose: "brand", duration: 60, tier: "cinema", res: "4k_up", script: "treatment", scenes: 6,
    characters: 0, locations: 4, costumes: 0, complex: ["render", "camera"], share: "most",
    music: "stock", sound: "basic", titles: "motion"
  }),
  "G-trailer-preset": S({
    purpose: "trailer", duration: 120, tier: "cinema", res: "4k", script: "ready", scenes: 20,
    characters: 4, locations: 6, costumes: 6, approval: "key", complex: ["action"], share: "half",
    sound: "full", music: "stock"
  }),
  "H-gift-preset": S({
    purpose: "gift", duration: 60, tier: "cinema", res: "1080", script: "idea", scenes: 5,
    characters: 1, locations: 3, costumes: 2, approval: "trust",
    complex: ["realperson", "consistency"], share: "most", sound: "full"
  }),
  "I-social-minimal": S({
    purpose: "social", duration: 15, tier: "commerce", res: "1080", script: "ready", scenes: 1,
    characters: 0, locations: 1, costumes: 0, approval: "trust", complex: [],
    music: "none", sound: "none", voice: "none", titles: "none"
  }),
  "J-explainer": S({
    purpose: "explainer", duration: 90, tier: "commerce", res: "1080", script: "idea", scenes: 8,
    characters: 1, locations: 3, costumes: 1, titles: "motion",
    complex: ["motion", "text"], share: "half", voice: "ai", music: "stock", sound: "basic"
  })
};

const out = {};
for (const [name, state] of Object.entries(CASES)) {
  const r = estimate(state);
  out[name] = {
    total: r.total,
    real: r.real,
    perMin: r.perMin,
    hours: r.hours,
    gens: r.gens,
    units: r.units,
    attempts: Math.round(r.attempts * 1000) / 1000,
    days: r.days,
    floored: r.floored,
    mods: r.mods.map((m) => [m.name, m.cost, m.k]),
    lines: r.lines.map((l) => [l.stage, l.name, l.cost, Math.round(l.hours * 100) / 100])
  };
}
console.log(JSON.stringify(out, null, 1));
