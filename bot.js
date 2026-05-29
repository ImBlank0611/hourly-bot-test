const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const cron = require("node-cron");
const fs = require("fs");
const { resolveTimezone } = require("./timezones");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

let config;
if (process.env.BOT_TOKEN) {
  const models = [];
  let i = 1;
  while (process.env[`MODEL_${i}_NAME`]) {
    models.push({
      name: process.env[`MODEL_${i}_NAME`],
      channelId: process.env[`MODEL_${i}_CHANNEL_ID`],
      location: process.env[`MODEL_${i}_LOCATION`],
      color: process.env[`MODEL_${i}_COLOR`] || "#ff6b9d",
      scheduleRaw: process.env[`MODEL_${i}_SCHEDULE`],
      notice: process.env[`MODEL_${i}_NOTICE`] || null,
    });
    i++;
  }

  // Fallback to old single-model env vars if no numbered ones found
  if (models.length === 0 && process.env.MODEL_NAME) {
    models.push({
      name: process.env.MODEL_NAME,
      channelId: process.env.CHANNEL_ID,
      location: process.env.LOCATION,
      color: process.env.COLOR || "#ff6b9d",
      scheduleRaw: process.env.SCHEDULE,
      notice: process.env.NOTICE || null,
    });
  }

  config = { botToken: process.env.BOT_TOKEN, models };
  console.log(`Loaded ${models.length} model(s) from environment variables`);
  models.forEach((m, idx) => console.log(`  Model ${idx + 1}: ${m.name} — ${m.location}`));
} else {
  try {
    config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
    console.log("Loaded config from config.json");
  } catch (e) {
    console.error("No BOT_TOKEN env var set and no config.json found.");
    process.exit(1);
  }
}

const CACHE_FILE = "./lastMessages.json";
function loadLastMessages() {
  try { if (fs.existsSync(CACHE_FILE)) return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")); } catch (e) {}
  return {};
}
function saveLastMessages(data) {
  try { fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2)); } catch (e) {}
}
const lastMessages = loadLastMessages();

const pad = (n) => String(n).padStart(2, "0");

function toAmPm(hour, minute) {
  const period = hour >= 12 ? "pm" : "am";
  const h = hour % 12 || 12;
  return minute === 0 ? `${h}${period}` : `${h}:${pad(minute)}${period}`;
}

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
    hour = h; minute = m || 0;
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
    schedule.push({
      start: `${pad(curr.hour)}:${pad(curr.minute)}`,
      end: `${pad(next.hour)}:${pad(next.minute)}`,
      activity: curr.activity,
      startDisplay: toAmPm(curr.hour, curr.minute),
      endDisplay: toAmPm(next.hour, next.minute),
    });
  }
  return schedule;
}

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
  return new Date().toLocaleTimeString("en-US", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: true });
}

function getStatusEmoji(activity) {
  if (!activity) return "😴";
  const l = activity.activity.toLowerCase();
  if (l.includes("sleep") || l.includes("rest") || l.includes("bed")) return "😴";
  if (l.includes("wake") || l.includes("waking") || l.includes("morning")) return "🌅";
  if (l.includes("gym") || l.includes("workout") || l.includes("exercise") || l.includes("training")) return "💪";
  if (l.includes("breakfast")) return "🥐";
  if (l.includes("lunch")) return "🥗";
  if (l.includes("dinner") || l.includes("eat") || l.includes("food") || l.includes("cooking") || l.includes("meal")) return "🍽️";
  if (l.includes("shower") || l.includes("bath")) return "🚿";
  if (l.includes("content") || l.includes("shoot") || l.includes("photo") || l.includes("video") || l.includes("filming") || l.includes("editing")) return "📸";
  if (l.includes("chat") || l.includes("reply") || l.includes("message") || l.includes("log on") || l.includes("online")) return "💬";
  if (l.includes("live") || l.includes("stream")) return "🔴";
  if (l.includes("walk") || l.includes("dog")) return "🐾";
  if (l.includes("relax") || l.includes("chill") || l.includes("free")) return "☕";
  if (l.includes("travel") || l.includes("commute") || l.includes("drive")) return "🚗";
  if (l.includes("work") || l.includes("admin") || l.includes("planning") || l.includes("brainstorm")) return "💼";
  if (l.includes("cappuccino") || l.includes("coffee")) return "☕";
  if (l.includes("youtube")) return "▶️";
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
    if (adjusted >= blockStart && adjusted < blockEnd) return schedule[(i + 1) % schedule.length];
  }
  return schedule[0];
}

function getProgressBar(schedule, timezone) {
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
    if (adjusted >= blockStart && adjusted < blockEnd) {
      const elapsed = adjusted - blockStart;
      const duration = blockEnd - blockStart;
      const percent = Math.round((elapsed / duration) * 100);
      const filled = Math.round(percent / 10);
      const bar = "█".repeat(filled) + "░".repeat(10 - filled);
      return `\`${bar}\` ${percent}%`;
    }
  }
  return null;
}

function buildTodaySchedule(schedule) {
  return schedule
    .map(block => `${getStatusEmoji(block)} \`${block.startDisplay}\` ${block.activity}`)
    .join("\n");
}

async function sendHourlyUpdates() {
  for (const model of config.models) {
    try {
      const channel = await client.channels.fetch(model.channelId);
      if (!channel) continue;

      if (lastMessages[model.channelId]) {
        try {
          const oldMsg = await channel.messages.fetch(lastMessages[model.channelId]);
          await oldMsg.delete();
        } catch (e) {}
      }

      const timezone = resolveTimezone(model.location);
      const schedule = parseSchedule(model.scheduleRaw);
      const activity = getCurrentActivity(schedule, timezone);
      const next = getNextActivity(schedule, timezone);
      const timeStr = formatTime(timezone);
      const emoji = getStatusEmoji(activity);
      const progressBar = getProgressBar(schedule, timezone);
      const todaySchedule = buildTodaySchedule(schedule);

      const embed = new EmbedBuilder()
        .setColor(model.color || "#ff6b9d")
        .setTitle(`${emoji}  ${model.name}'s Status`)
        .setDescription(
          `## ${activity ? `${getStatusEmoji(activity)} ${activity.activity}` : "Off schedule 😴"}\n` +
          (progressBar ? `${progressBar}\n` : "") +
          (activity ? `*${activity.startDisplay} → ${activity.endDisplay}*` : "")
        )
        .addFields(
          { name: "🕐 Local Time", value: `\`\`\`${timeStr}\`\`\``, inline: true },
          { name: "📍 Location", value: `\`\`\`${model.location}\`\`\``, inline: true },
        );

      if (next) {
        embed.addFields({
          name: "⏭️ Up Next",
          value: `${getStatusEmoji(next)} **${next.activity}** at **${next.startDisplay}**`,
        });
      }

      embed.addFields({
        name: "📅 Today's Schedule",
        value: todaySchedule,
      });

      if (model.notice) {
        embed.addFields({ name: "⚠️ Notice", value: `> ${model.notice}` });
      }

      embed.setFooter({ text: `Hourly update • ${new Date().toUTCString()}` });
      embed.setTimestamp();

      const sent = await channel.send({ embeds: [embed] });
      lastMessages[model.channelId] = sent.id;
      saveLastMessages(lastMessages);
      console.log("Sent update for " + model.name);
    } catch (err) {
      console.error("Error for " + model.name + ": " + err.message);
    }
  }
}

client.once("clientReady", () => {
  console.log("Bot logged in as " + client.user.tag);
  sendHourlyUpdates();
  cron.schedule("0 * * * *", sendHourlyUpdates);
});

client.login(config.botToken);
