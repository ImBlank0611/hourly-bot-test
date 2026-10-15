# 🤖 Discord Hourly Status Bot — Chatter Manager Edition

Sends an hourly embed to Discord showing what your model is currently doing, her local time, and what's coming up next.

---

## 📦 Setup (one time)

### 1. Install Node.js
Download from https://nodejs.org (LTS version)

### 2. Install dependencies
```bash
npm install
```

### 3. Create your Discord Bot
1. Go to https://discord.com/developers/applications
2. Click **New Application** → name it anything
3. Go to **Bot** → click **Add Bot**
4. Under **Token** → click **Reset Token** → copy it
5. Go to **OAuth2 → URL Generator**:
   - Scopes: check `bot`
   - Bot Permissions: check `Send Messages`, `Embed Links`, `View Channels`
6. Copy the generated URL → open it → add bot to your server

### 4. Get your Channel ID
1. In Discord: **Settings → Advanced → Enable Developer Mode**
2. Right-click the channel → **Copy Channel ID**

---

## ⚙️ config.json — All you need to edit

```json
{
  "botToken": "YOUR_BOT_TOKEN_HERE",
  "models": [
    {
      "name": "Sophie",
      "channelId": "YOUR_CHANNEL_ID",
      "location": "Los Angeles",
      "color": "#ff6b9d",
      "scheduleRaw": "6am Wake up 7am Breakfast 9am Gym 12pm Shower 1pm Lunch 3pm Content 5pm Walk Dog 6pm Dinner 8pm Log on to chat 1am Sleep"
    }
  ]
}
```

### scheduleRaw format
Just type the schedule naturally — time then activity, all in one line:

```
"6am Wake up 7am Breakfast 9am Gym 12pm Shower 1pm Lunch 3pm Content 8pm Chat 1am Sleep"
```

Supported time formats:
- `6am`, `7pm`, `12pm`, `1am`
- `6:30am`, `10:30pm`
- `12` (noon — add am/pm to be safe)

The bot automatically figures out end times from the next entry. Overnight blocks (e.g. 1am Sleep → wraps to 6am) work automatically.

### location field
Just type the country or city — timezone is automatic:

| You type | Timezone used |
|---|---|
| `"Los Angeles"` | America/Los_Angeles |
| `"London"` | Europe/London |
| `"Philippines"` | Asia/Manila |
| `"Dubai"` | Asia/Dubai |
| `"Sydney"` | Australia/Sydney |
| `"New York"` | America/New_York |

Full location list is in `timezones.js` — easy to add more.

### Adding multiple models
Just add more entries to the `models` array:

```json
"models": [
  {
    "name": "Sophie",
    "channelId": "111111111111",
    "location": "Los Angeles",
    "color": "#ff6b9d",
    "scheduleRaw": "7am Wake up 9am Gym 1pm Lunch 3pm Content 8pm Chat 12am Sleep"
  },
  {
    "name": "Mia",
    "channelId": "222222222222",
    "location": "London",
    "color": "#a78bfa",
    "scheduleRaw": "8am Wake up 10am Breakfast 12pm Content 2pm Reply to messages 6pm Dinner 9pm Stream 2am Sleep"
  }
]
```

Each model posts to her own channel.

---

## ▶️ Running the bot

```bash
node bot.js
```

On startup it will print the parsed schedule so you can verify it looks right:

```
📋 Sophie (Los Angeles → America/Los_Angeles)
   00:00 – 06:00  Sleep
   06:00 – 07:00  Wake up
   07:00 – 09:00  Breakfast
   ...
```

Then it sends a message immediately, and every hour at :00.

### Keep it running 24/7
```bash
npm install -g pm2
pm2 start bot.js --name hourly-bot
pm2 save
pm2 startup
```

---

## 💬 Example Discord embed

```
🚿 Sophie
Currently: Shower

🕐 Her Local Time    📍 Location
   12:00 PM            Los Angeles

⏭️ Up Next
🥗 Lunch at 13:00
```

---

## 🐋 Whale rules (any model)

Each model's card shows each whale's rule for **today** in big text at the very top of the status box (no day name). If a whale has no rule for today, nothing is shown for that whale.

- 🟥 just talk, no selling (also shown on a sales day when the current shift is not allowed to sell)
- 🟩 selling is on for this shift
- 🟧 freestyle
- 🟪 your own text, shown big

### Edit in Railway (no GitHub needed)

Add a variable `MODEL_n_WHALES` (same number `n` as that model's other variables):

```
MODEL_2_WHALES="April(MONDAY-4PM, TUESDAY-CHAT, WEDNESDAY-8AM, THURSDAY-CHAT, FRIDAY-8AM, SAT+SUN-FREE only talk, sexting only if she asks, never offer first)"
```

- Format: `Name(DAY-rule, DAY-rule, ...)`. Several whales: separate with `;` or a new line.
- Day: `MONDAY` or `MON`. Use `SAT+SUN` or `WEEKEND` for more than one day.
- Rule:
  - `4PM` or `8AM+4PM` means a sales day and only those shifts may sell (`12AM`, `8AM`, `4PM`). The box shows 🟩 when the current shift may sell and 🟥 when it may not.
  - `CHAT` or `CHAT your note` means chat only.
  - `FREE your note` means freestyle.
  - Anything else is shown exactly as written.
- Days follow Manila time. Change it with the variable `WHALES_TIMEZONE` (for example `Asia/Manila`).
- Bad entries are skipped and a warning shows in the deploy logs.

### Edit in GitHub (optional)

`whales.json` can hold rules too, including reusable weekly `templates`. If a whale is in both, the Railway variable wins for that whale.

---

## 🧹 Cards clean themselves up

- Each hourly card is deleted automatically after 60 minutes. Change this with the Railway variable `CARD_LIFETIME_MINUTES` (default `60`).
- On startup the bot also deletes any old cards it posted in the last 50 messages of each model channel, so a redeploy never leaves a stray card behind.
- The bot needs **View Channel**, **Send Messages**, **Embed Links** and **Read Message History** in each channel.
