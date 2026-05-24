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
