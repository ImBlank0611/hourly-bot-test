// ============================================================
// Discord Hourly Status Bot — Chatter Manager Edition
// ============================================================
// Requirements: npm install discord.js node-cron
// Run: node bot.js
// ============================================================

const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const cron = require("node-cron");
const fs = require("fs");
const { resolveTimezone } = require("./timezones");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ── Config: reads from environment variables (Railway) or config.json (local) ──
let config;
if (process.env.BOT_TOKEN) {
  // Running on Railway — build config from env vars
  config = {
    botToken: process.env.BOT_TOKEN,
    models: [
      {
        name: process.env.MODEL_NAME,
        channelId: process.env.CHANNEL_ID,
        location: process.env.LOCATION,
        color: process.env.COLOR || "#ff6b9d",
        scheduleRaw: process.env.SCHEDULE,
      },
    ],
  };
  console.log("✅ Loaded config from environment variables");
} else {
  // Running locally — use config.json
  config = require("./config.json");
  console.log("✅ Loaded config from config.json");
}

// ── Persistent message ID storage ────────────────────────────
const CACHE_FILE = "./lastMessages.json";

function loadLastMessages() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    }
  } catch (e) {}
  return {};
}

function saveLastMessages(data) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.warn("⚠️  Could not save message cache:", e.message);
  }
}

const lastMessages = loadLastMessages();

// ── Schedule Parser ───────────────────────────────────────────

function parseSchedule(raw) {
  const tokenRegex = /(\d{1,2}(?::\d{2})?(?:am|pm)?)\s+([^0-9]+?)(?=\d{1,2}(?::\d{2})?(?:am|pm)?|$)/gi;
  const entries = [];
  let match;

  while ((match = tokenRegex.exec(raw.trim())) !== null) {
    const timeStr = match[1].trim().toLowerCase();
    const activity = match[2].trim().replace(/\s+/g, " ");
    if (!activity) continue;

    let hour, minute = 0;
    const hasAmPm = /am|pm/.test(timeStr);
    const timePart = timeStr.replace(/am|pm/, "");
    const [h, m] = timePart.split(":").map(Number);
    hour = h;
    minute = m || 0;

    if (hasAmPm) {
      const isPm = timeStr.includes("pm");
      if (isPm && hour !== 12) hour += 12;
      if (!isPm && hour === 12) hour = 0;
    }

    entries.push({ hour, minute, activity });
  }

  entries.sort((a, b) => (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute));

  const schedule = [];
  for (let i = 0; i < entries.length; i++) {
    const curr = entries[i];
    const next = entries[(i + 1) % entries.length];
    const pad = (n) => String(n).padStart(2, "0");
    schedule.push({
      start: `${pad(curr.hour)}:${pad(curr.minute)}`,
      end: `${pad(next.hour)}:${pad(next.minute)}`,
      activity: curr.activity,
    });
  }

  return schedule;
}

// ── Helpers ───────────────────────────────────────────────────

function getCurrentActivity(schedule, timezone) {
  const now = new Date().toLocaleString("en-US", { timeZone: timezone });
  const localTime = new Date(now);
  const currentMinutes = localTime.getHours() * 60 + localTime.getMinutes();

  for (const block of schedule) {
    const [sh, sm] = block.start.split(":").map(Number);
    const [eh, em] = block.end.split(":").map(Number);
    const blockStart = sh * 60 + sm;
    let blockEnd = eh * 60 + em;
    if (blockEnd <= blockStart) blockEnd += 24 * 60;
    const adjusted = currentMinutes < blockStart ? currentMinutes + 24 * 60 : currentMinutes;
    if (adjusted >= blockStart && adjusted < blockEnd) return block;
  }
  return null;
}

function formatTime(timezone) {
  return new Date().toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getStatusEmoji(activity) {
  if (!activity) return "😴";
  const l = activity.activity.toLowerCase();
  if (l.includes("sleep") || l.includes("rest") || l.includes("bed")) return "😴";
  if (l.includes("wake") || l.includes("waking") || l.includes("morning")) return "🌅";
  if (l.includes("gym") || l.includes("workout") || l.includes("exercise")) return "💪";
  if (l.includes("breakfast")) return "🥐";
  if (l.includes("lunch")) return "🥗";
  if (l.includes("dinner") || l.includes("eat") || l.includes("food")) return "🍽️";
  if (l.includes("shower") || l.includes("bath")) return "🚿";
  if (l.includes("content") || l.includes("shoot") || l.includes("photo") || l.includes("video")) return "📸";
  if (l.includes("chat") || l.includes("reply") || l.includes("message") || l.includes("log on") || l.includes("online")) return "💬";
  if (l.includes("live") || l.includes("stream")) return "🔴";
  if (l.includes("walk") || l.includes("dog")) return "🐾";
  if (l.includes("relax") || l.includes("chill") || l.includes("free")) return "☕";
  if (l.includes("travel") || l.includes("commute") || l.includes("drive")) return "🚗";
  return "✨";
}

function getNextActivity(schedule, timezone) {
  const now = new Date().toLocaleString("en-US", { timeZone: timezone });
  const localTime = new Date(now);
  const currentMinutes = localTime.getHours() * 60 + localTime.getMinutes();

  for (let i = 0; i < schedule.length; i++) {
    const block = schedule[i];
    const [sh, sm] = block.start.split(":").map(Number);
    const [eh, em] = block.end.split(":").map(Number);
    const blockStart = sh * 60 + sm;
    let blockEnd = eh * 60 + em;
    if (blockEnd <= blockStart) blockEnd += 24 * 60;
    const adjusted = currentMinutes < blockStart ? currentMinutes + 24 * 60 : currentMinutes;
    if (adjusted >= blockStart && adjusted < blockEnd) {
      return schedule[(i + 1) % schedule.length];
    }
  }
  return schedule[0];
}

// ── Main send function ────────────────────────────────────────

async function sendHourlyUpdates() {
  for (const model of config.models) {
    try {
      const channel = await client.channels.fetch(model.channelId);
      if (!channel) continue;

      // Delete previous message if saved
      if (lastMessages[model.channelId]) {
        try {
          const oldMsg = await channel.messages.fetch(lastMessages[model.channelId]);
          await oldMsg.delete();
          console.log(`[${new Date().toISOString()}] 🗑️  Deleted old message for ${model.name}`);
        } catch (e) {
          console.warn(`⚠️  Could not delete old message for ${model.name}: ${e.message}`);
        }
      }

      const timezone = resolveTimezone(model.location);
      const schedule = parseSchedule(model.scheduleRaw);
      const activity = getCurrentActivity(schedule, timezone);
      const next = getNextActivity(schedule, timezone);
      const timeStr = formatTime(timezone);
      const emoji = getStatusEmoji(activity);

      const embed = new EmbedBuilder()
        .setColor(model.color || "#ff6b9d")
        .setTitle(`${emoji} ${model.name}`)
        .setDescription(
          activity
            ? `**Currently:** ${activity.activity}`
            : `**Currently:** Off schedule 😴`
        )
        .addFields(
          { name: "🕐 His Local Time", value: `\`${timeStr}\``, inline: true },
          { name: "📍 Location", value: `\`${model.location}\``, inline: true }
        );

      if (next) {
        embed.addFields({
          name: "⏭️ Up Next",
          value: `${getStatusEmoji(next)} ${next.activity} at ${next.start}`,
        });
      }

      embed.setFooter({ text: `Hourly update • ${new Date().toUTCString()}` });

      const sent = await channel.send({ embeds: [embed] });
      lastMessages[model.channelId] = sent.id;
      saveLastMessages(lastMessages);

      console.log(`[${new Date().toISOString()}] ✅ Sent update for ${model.name} (${model.location} → ${timezone})`);
    } catch (err) {
      console.error(`❌ Error for ${model.name}:`, err.message);
    }
  }
}

// ── Bot ready ─────────────────────────────────────────────────

client.once("clientReady", () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);

  for (const model of config.models) {
    const tz = resolveTimezone(model.location);
    const schedule = parseSchedule(model.scheduleRaw);
    console.log(`\n📋 ${model.name} (${model.location} → ${tz})`);
    schedule.forEach(s => console.log(`   ${s.start} – ${s.end}  ${s.activity}`));
  }

  sendHourlyUpdates();
  cron.schedule("0 * * * *", sendHourlyUpdates);
});

client.login(config.botToken);
