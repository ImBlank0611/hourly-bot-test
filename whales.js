// ============================================================
// Whale rules: shows TODAY's rule for each whale at the top of a model's card.
// Rules live in whales.json so you never touch bot.js or config.json.
// Works for any model: add an entry under "models" with that model's name
// (same name as in config.json).
// ============================================================

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "whales.json");
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

// Chatter shifts are in team time. Each shift is 8 hours.
const SHIFTS = [
  { key: "12am", start: 0, end: 8 },
  { key: "8am", start: 8, end: 16 },
  { key: "4pm", start: 16, end: 24 },
];

function loadRules() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch (e) {
    console.warn("⚠️  Could not read whales.json:", e.message);
    return {};
  }
}

// Weekday + hour in a given timezone
function localParts(tz, now) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday").value.toLowerCase();
  const hour = parseInt(parts.find((p) => p.type === "hour").value, 10) % 24;
  return { weekday, hour };
}

function shiftFor(hour) {
  return SHIFTS.find((s) => hour >= s.start && hour < s.end).key;
}

const normShift = (s) => String(s).toLowerCase().replace(/\s+/g, "");

// Turn one day's rule into a big block of text (colored square + large heading),
// shown at the top of the card so chatters see it first. No day name is shown.
const RED = 0xef4444, GREEN = 0x22c55e, AMBER = 0xf59e0b, PURPLE = 0x8b5cf6;

function render(whaleName, rule, currentShift) {
  const name = String(whaleName).toUpperCase();
  const head = `## 🐋 ${name}\n`;
  const note = rule && rule.note ? `\n**${rule.note}**` : "";

  if (rule.mode === "chat") {
    return { color: RED, description: head + "# 🟥 JUST TALK. NO SELLING." + note };
  }

  if (rule.mode === "sales") {
    const shifts = (rule.shifts || []).map(normShift);
    if (!shifts.length || shifts.includes(currentShift)) {
      const which = shifts.length ? ` (${shifts.join(" + ")} shift)` : "";
      return {
        color: GREEN,
        description: head + `# 🟩 SELLING IS ON${which}` + (shifts.length ? "\nOther shifts: just talk." : "") + note,
      };
    }
    return {
      color: RED,
      description:
        head + "# 🟥 JUST TALK RIGHT NOW. NO SELLING." + `\nSelling today is only for the **${shifts.join(" + ")}** shift.` + note,
    };
  }

  if (rule.mode === "free") {
    return { color: AMBER, description: head + "# 🟧 FREESTYLE" + note };
  }

  const text = rule.note || "See notes";
  return { color: PURPLE, description: head + (text.length > 80 ? `## 🟪 ${text}` : `# 🟪 ${text}`) };
}

// ── Railway variable support ─────────────────────────────────
// MODEL_2_WHALES="April(MONDAY-4PM, TUESDAY-Just talk, SAT+SUN-FREE only talk); Jay(FRIDAY-8AM)"
//   - Whales are separated by ; or a new line.   Name(rule, rule, ...)
//   - Each rule is DAY-what to do. Day can be MONDAY, MON, SAT+SUN or WEEKEND.
//   - What to do:
//       4PM  or  8AM+4PM   -> sales day, only those shifts may sell
//       CHAT <note>        -> chat only
//       FREE <note>        -> freestyle
//       anything else      -> shown as written
const DAY_ALIASES = {
  sun: "sunday", mon: "monday", tue: "tuesday", tues: "tuesday", wed: "wednesday",
  thu: "thursday", thur: "thursday", thurs: "thursday", fri: "friday", sat: "saturday",
};

function resolveDays(token) {
  const out = [];
  for (const part of token.split(/[+&/]/)) {
    const k = part.trim().toLowerCase();
    if (!k) continue;
    if (k === "weekend" || k === "weekends") { out.push("saturday", "sunday"); continue; }
    const full = DAYS.includes(k) ? k : DAY_ALIASES[k] || DAY_ALIASES[k.slice(0, 3)];
    if (full && (DAYS.includes(k) || DAY_ALIASES[k])) out.push(full);
    else return null;
  }
  return out.length ? out : null;
}

const SHIFT_LIST = /^\d{1,2}\s*(am|pm)(\s*[+&/]\s*\d{1,2}\s*(am|pm))*$/i;

function parseRule(text) {
  const t = text.trim();
  const noShiftWord = t.replace(/\s*shifts?$/i, "");
  if (SHIFT_LIST.test(noShiftWord)) {
    return { mode: "sales", shifts: noShiftWord.split(/[+&/]/).map(normShift) };
  }
  let m = t.match(/^chat\b[\s:.-]*(?:only\s*$)?(.*)$/i);
  if (m) return { mode: "chat", note: m[1] || undefined };
  m = t.match(/^free(style)?\b[\s:.-]*(?:only\s*$)?(.*)$/i);
  if (m) return { mode: "free", note: m[2] || undefined };
  return { mode: "text", note: t };
}

// Split "A, B" into rules, but only at commas followed by "DAY-"
function splitRules(body) {
  return body.split(/,\s*(?=[A-Za-z]+(?:\s*[+&/]\s*[A-Za-z]+)*\s*-)/);
}

// Split top level by ; or newline (ignoring ones inside parentheses)
function splitWhales(raw) {
  const parts = [];
  let depth = 0, cur = "";
  for (const ch of raw) {
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if ((ch === ";" || ch === "\n") && depth === 0) { parts.push(cur); cur = ""; } else cur += ch;
  }
  parts.push(cur);
  return parts.map((p) => p.trim()).filter(Boolean);
}

function parseWhalesEnv(raw, modelName = "") {
  const whales = [];
  if (!raw || !String(raw).trim()) return whales;
  for (const chunk of splitWhales(String(raw))) {
    const open = chunk.indexOf("(");
    const close = chunk.lastIndexOf(")");
    if (open < 1 || close < open) {
      console.warn(`⚠️  ${modelName} WHALES: could not read "${chunk}". Use Name(DAY-rule, DAY-rule)`);
      continue;
    }
    const name = chunk.slice(0, open).trim();
    const days = {};
    for (const rule of splitRules(chunk.slice(open + 1, close))) {
      const dash = rule.indexOf("-");
      if (dash < 1) { console.warn(`⚠️  ${modelName} ${name}: "${rule.trim()}" needs DAY-rule`); continue; }
      const dayList = resolveDays(rule.slice(0, dash));
      if (!dayList) { console.warn(`⚠️  ${modelName} ${name}: unknown day "${rule.slice(0, dash).trim()}"`); continue; }
      const parsed = parseRule(rule.slice(dash + 1));
      for (const d of dayList) days[d] = parsed;
    }
    whales.push({ name, days, fromEnv: true });
  }
  return whales;
}

// Returns one text block per whale for a model, showing only today's rule.
// `model` can be the model name or the model object ({ name, whales }).
// `now` is optional, used for testing.
// Rules come from whales.json and from the Railway variable MODEL_n_WHALES.
// If both define the same whale, the Railway variable wins for that whale.
// A whale with no rule today shows nothing.
function getWhaleBlocks(model, now = new Date()) {
  const modelName = typeof model === "string" ? model : model.name;
  const envRaw = typeof model === "string" ? "" : model.whales;

  const rules = loadRules();
  const fromFile = Array.isArray((rules.models || {})[modelName]) ? rules.models[modelName] : [];
  const fromEnv = parseWhalesEnv(envRaw, modelName);

  const envNames = new Set(fromEnv.map((w) => w.name.toLowerCase()));
  const list = [...fromFile.filter((w) => !envNames.has(String(w.name).toLowerCase())), ...fromEnv];

  const defaultTz = process.env.WHALES_TIMEZONE || rules.timezone || "Asia/Manila";
  const banners = [];
  for (const whale of list) {
    const tz = whale.timezone || defaultTz;
    const { weekday, hour } = localParts(tz, now);
    const template = whale.template ? (rules.templates || {})[whale.template] : null;
    const days = { ...(template || {}), ...(whale.days || {}) };
    if (!days[weekday]) continue;

    const banner = render(whale.name, days[weekday], shiftFor(hour));
    banner.description = banner.description.slice(0, 4000);
    banners.push(banner);
  }
  return banners;
}

module.exports = { getWhaleBlocks, parseWhalesEnv, DAYS };
