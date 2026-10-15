// ============================================================
// Whale rules: shows TODAY's rule for each whale on a model's card.
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

// Turn one day's rule into text for the card
function describe(rule, currentShift) {
  if (!rule) return "No rule set for today.";
  const lines = [];

  if (rule.mode === "chat") {
    lines.push("💬 **Chat only**");
    lines.push(rule.note || "Just talk. No selling today.");
  } else if (rule.mode === "sales") {
    const shifts = (rule.shifts || []).map(normShift);
    const label = shifts.length ? shifts.join(" + ") + " shift only" : "all shifts";
    lines.push(`💰 **Sales day: ${label}**`);
    if (shifts.length) {
      lines.push("Other shifts: chat only.");
      lines.push(
        shifts.includes(currentShift)
          ? `Right now (${currentShift} shift): ✅ you can go for sales`
          : `Right now (${currentShift} shift): 💬 chat only`
      );
    }
    if (rule.note) lines.push(rule.note);
  } else if (rule.mode === "free") {
    lines.push("🎲 **Freestyle**");
    lines.push(rule.note || "Mostly just talk.");
  } else {
    lines.push(rule.note || "No rule set for today.");
  }

  return lines.join("\n");
}

// Returns embed fields (one per whale) for a model, showing only today's rule.
// `now` is optional, used for testing.
function getWhaleFields(modelName, now = new Date()) {
  const rules = loadRules();
  const list = (rules.models || {})[modelName];
  if (!Array.isArray(list)) return [];

  const fields = [];
  for (const whale of list) {
    const tz = whale.timezone || rules.timezone || "Asia/Manila";
    const { weekday, hour } = localParts(tz, now);
    const template = whale.template ? (rules.templates || {})[whale.template] : null;
    const days = { ...(template || {}), ...(whale.days || {}) };
    const dayName = weekday[0].toUpperCase() + weekday.slice(1);

    fields.push({
      name: `🐋 ${whale.name} · ${dayName}`,
      value: describe(days[weekday], shiftFor(hour)).slice(0, 1024),
    });
  }
  return fields;
}

module.exports = { getWhaleFields, DAYS };
