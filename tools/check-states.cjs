// Renders the calculator in a real browser once per state and compares the
// visible result with the reference (original) engine: totals, panels, every
// estimate row and its cost, plus text hygiene (no untranslated or broken text).
// This makes sure a copy-editing pass can never silently change behaviour.
//
// Usage:
//   node tools/check-states.cjs index.html _source/engine-ru.cjs
//
// Needs Google Chrome; override the binary with CHROME=/path/to/chrome.
// The reference engine is the pure estimate() extracted from the original
// Russian site (see README, "Verify the pricing numbers").

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const run = promisify(execFile);

const CONCURRENCY = 4;

const [, , htmlPath = 'index.html', ruEnginePath = '_source/engine-ru.cjs'] = process.argv;
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const html = fs.readFileSync(htmlPath, 'utf8');
const ru = require(path.resolve(ruEnginePath));
const estimateRu = ru.estimate || ru;

const DEF = eval('(' + html.match(/const DEF=(\{[\s\S]*?\});/)[1] + ')');
const st = o => Object.assign({}, DEF, o);

// [name, state, optional text checks on the rendered DOM]
const STATES = [
  ['default', st({}), {
    must: ['and we get a clear brief', '$2,000', 'Brief and concept', 'Idea development', 'Sound design'],
    mustNot: ['$2 000', 'Project bible', 'Film concept', 'Music (composer)', 'Upscale to 4K']
  }],
  ['trailer-preset', st({ purpose: 'trailer', tier: 'cinema', duration: 120, scenes: 20, characters: 4, locations: 6, costumes: 6, sound: 'full' }), {
    must: ['Film concept', 'Trailer script', 'Moodboard and style'],
    mustNot: ['Idea development']
  }],
  ['ip-preset', st({ purpose: 'ip', tier: 'cinema', duration: 900, scenes: 40, characters: 10, locations: 10, costumes: 12, sound: 'full', music: 'composer' }), {
    must: ['Project bible', 'Music (composer)', 'Full sound design']
  }],
  ['gift-preset', st({ purpose: 'gift', tier: 'cinema', duration: 60, scenes: 5, characters: 1, locations: 3, costumes: 2, sound: 'full', share: 'most', complex: ['realperson', 'consistency'], music: 'stock' }), {
    must: ['one of your own', 'favorite film', 'checked "A real person on screen"', 'Complex scene preparation']
  }],
  ['clip', st({ purpose: 'clip', tier: 'cinema' }), { must: ['A music video is lip sync'] }],
  ['social-preset', st({ purpose: 'social', tier: 'commerce', music: 'stock' })],
  ['anim-ours', st({ purpose: 'anim', tier: 'cinema', characters: 2, costumes: 2 }), {
    must: ['Animation style development'], mustNot: ['Style adaptation from reference']
  }],
  ['anim-ref', st({ purpose: 'anim', tier: 'cinema', characters: 2, costumes: 2, animStyle: 'ref' }), {
    must: ['Style adaptation from reference'], mustNot: ['Animation style development']
  }],
  ['explainer', st({ purpose: 'explainer', tier: 'commerce', titles: 'motion' }), { must: ['Motion design'] }],
  ['brand-film', st({ purpose: 'brand', tier: 'cinema' })],
  ['feature-film', st({ purpose: 'film', tier: 'cinema' })],
  ['facecap', st({ hybrid: 'facecap', shootDays: 2 }), {
    must: ['Capture preparation', 'Specialist and equipment', 'Facial performance transfer', 'Capture shifts (a shift is 8\u201310 hours)', 'starting price per shift', 'starting price depends on the city'],
    mustNot: ['Shoot preparation']
  }],
  ['facecap-no-studio', st({ hybrid: 'facecap', shootDays: 1, faceStudio: false }), {
    must: ['Capture preparation'], mustNot: ['Studio rental']
  }],
  ['shoot', st({ hybrid: 'shoot', shootDays: 2 }), {
    must: ['Shoot preparation', 'Shoot day \u00d72', 'starting price \u2014 the total depends'], mustNot: ['Capture preparation']
  }],
  ['client-footage', st({ hybrid: 'client' }), { must: ['Shooting brief', 'Live-action integration'] }],
  ['4k-native', st({ res: '4k' }), { must: ['native 4K'], mustNot: ['Upscale to 4K'] }],
  ['4k-upscale', st({ res: '4k_up' }), { must: ['Upscale to 4K (Topaz)'] }],
  ['render-camera', st({ complex: ['render', 'camera', 'dialogue'], share: 'most', langs: 2, formats: 2 }), {
    must: ['CGI / 3D specialist', 'Preparation from renders', 'Language versions \u00d72', 'Extra formats \u00d72', 'lip sync'],
    mustNot: ['Shooting brief']
  }],
  ['tv-urgent', st({ usage: 'tv', rush: 'urgent' }), { must: ['Rights: TV / outdoor / cinema', 'Rush'] }],
  ['ads-fast', st({ usage: 'ads', rush: 'fast' }), { must: ['Rights: paid advertising', 'Accelerated timeline'] }],
  ['full-audio', st({ sound: 'full', music: 'composer', voice: 'actor', titles: 'motion', subs: true }), {
    must: ['Full sound design', 'Music (composer)', 'Voice-over (human narrator)', 'Motion design', 'Subtitles'],
    mustNot: ['<span>Sound design</span>', 'Voice-over (AI voice)']
  }],
  ['no-audio', st({ sound: 'none', music: 'none', voice: 'none', titles: 'none' }), {
    // Check estimate rows, not the always-present question labels in step 6.
    mustNot: ['<div class="ln"><span>Sound design', '<div class="ln"><span>Full sound design', '<div class="ln"><span>Music (', '<div class="ln"><span>Voice-over', '<div class="ln"><span>Titles and logo', '<div class="ln"><span>Subtitles']
  }],
  ['ai-music-voice', st({ music: 'ai', voice: 'ai' }), { must: ['Music (AI-generated)', 'Voice-over (AI voice)'] }],
  ['trust-no-development', st({ approval: 'trust', characters: 0, locations: 1, costumes: 0 }), {
    must: ["at the production's discretion", 'Locations \u00d71'],
    mustNot: ['<span>Characters \u00d7', '<span>Costumes and looks \u00d7']
  }],
  ['full-approval', st({ approval: 'full', characters: 3, locations: 4, costumes: 3 }), {
    must: ['every element approved in detail']
  }],
  ['minimal-social', st({ purpose: 'social', duration: 15, scenes: 1, sound: 'none', music: 'none', titles: 'none' })],
  ['revisions-formats', st({ revisions: 4, formats: 3, langs: 1 }), { must: ['Extra revision rounds \u00d72'] }],
  ['long-cinema-4k', st({ duration: 300, scenes: 12, res: '4k', tier: 'cinema', complex: ['consistency', 'action'], share: 'half' })]
];

const money = v => '$' + Math.round(v).toLocaleString('en-US');
const unnum = s => Number(String(s).replace(/[^0-9.-]/g, ''));
const STAGES = {
  'Pre-production': 'pre', 'Live action': 'shoot', 'Generation': 'gen',
  'Post-production': 'post', 'Production management': 'mgmt', 'Surcharges': 'mods'
};
const decode = t => t.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

async function check([name, state, checks = {}]) {
  const file = path.join(os.tmpdir(), 'calc-state-' + name + '.html');
  fs.writeFileSync(file, html.replace(/const DEF=\{[\s\S]*?\};/, 'const DEF=' + JSON.stringify(state) + ';'));

  let dom;
  try {
    // Note: a fresh --user-data-dir makes headless Chrome hang on macOS, so we
    // run with the default profile. The page only reads localStorage on load
    // and never saves without user interaction, so runs stay isolated.
    ({ stdout: dom } = await run(CHROME, [
      '--headless=new', '--disable-gpu', '--virtual-time-budget=5000', '--dump-dom', 'file://' + file
    ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
  } catch (e) {
    return { name, problems: ['chrome: ' + String(e.message).split('\n')[0]], exp: null };
  }

  const rendered = dom.replace(/<script[\s\S]*?<\/script>/g, '');
  const text = decode(rendered);
  const exp = estimateRu(Object.assign({}, state));
  const problems = [];
  const grab = re => { const m = rendered.match(re); return m ? m[1] : null; };

  const gotTotal = unnum(grab(/<span>Total<\/span>\s*<span[^>]*>([^<]+)<\/span>/));
  if (gotTotal !== exp.total) problems.push(`total ${gotTotal} != ${exp.total}`);
  const gotPrice = unnum(grab(/id="price"[^>]*>([^<]*)</));
  if (gotPrice !== exp.total) problems.push(`price ${gotPrice} != ${exp.total}`);
  const gotMin = unnum(grab(/id="fMin"[^>]*>([^<]*)</));
  if (gotMin !== exp.perMin) problems.push(`perMin ${gotMin} != ${exp.perMin}`);
  const gotDays = unnum(grab(/id="fDays"[^>]*>([^<]*)</));
  if (gotDays !== exp.days) problems.push(`days ${gotDays} != ${exp.days}`);
  const gotGens = unnum(grab(/id="fGens"[^>]*>([^<]*)</));
  if (gotGens !== exp.gens) problems.push(`gens ${gotGens} != ${exp.gens}`);
  const range = grab(/id="realP"[^>]*>([^<]*)</);
  const rnums = range ? [...range.matchAll(/\$([\d,]+)/g)].map(m => unnum(m[1])) : [];
  if (rnums[0] !== exp.total || rnums[1] !== exp.real) problems.push(`real range "${range}" != ${money(exp.total)} \u2013 ${money(exp.real)}`);

  const expected = { pre: [], shoot: [], gen: [], post: [], mgmt: [], mods: [] };
  exp.lines.forEach(l => expected[l.stage].push(l.cost));
  exp.mods.forEach(m => expected.mods.push(m.cost));
  const got = { pre: [], shoot: [], gen: [], post: [], mgmt: [], mods: [] };
  rendered.split('<div class="sg">').slice(1).forEach(block => {
    const h = block.match(/<span>([^<]+)<\/span>/);
    const key = h && STAGES[h[1]];
    if (!key) return;
    [...block.matchAll(/<div class="ln"><span>[^<]*<\/span><b>\+?\$([\d,]+)<\/b>/g)].forEach(m => got[key].push(unnum(m[1])));
  });
  Object.keys(expected).forEach(k => {
    if (expected[k].length !== got[k].length || expected[k].some((v, i) => v !== got[k][i]))
      problems.push(`${k} rows [${got[k].join(',')}] != [${expected[k].join(',')}]`);
  });

  const cyr = [...new Set(text.match(/[\u0400-\u04FF]+/g) || [])];
  if (cyr.length) problems.push('cyrillic: ' + cyr.slice(0, 3).join(' '));
  ['undefined', 'NaN', '${', '[object'].forEach(bad => { if (text.includes(bad)) problems.push('raw ' + bad); });
  (checks.must || []).forEach(s => { if (!text.includes(s)) problems.push('missing: ' + s); });
  (checks.mustNot || []).forEach(s => { if (text.includes(s)) problems.push('unexpected: ' + s); });

  return { name, problems, exp };
}

(async () => {
  const results = new Array(STATES.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, STATES.length) }, async () => {
    while (next < STATES.length) {
      const i = next++;
      results[i] = await check(STATES[i]);
    }
  }));

  let failures = 0;
  for (const { name, problems, exp } of results) {
    const total = exp ? money(exp.total).padStart(9) : '?'.padStart(9);
    if (problems.length) { failures++; console.log('FAIL ' + name.padEnd(20) + total + '  \u2190 ' + problems.join('; ')); }
    else console.log('OK   ' + name.padEnd(20) + total);
  }

  console.log('\n' + (failures ? failures + ' of ' + STATES.length + ' states FAILED' : 'all ' + STATES.length + ' states match the reference engine'));
  process.exit(failures ? 1 : 0);
})();
