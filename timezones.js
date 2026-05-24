// Auto-mapped timezones by country/city
// Usage: const { resolveTimezone } = require("./timezones");

const LOCATION_MAP = {
  // 🇺🇸 United States
  "us": "America/New_York",
  "usa": "America/New_York",
  "united states": "America/New_York",
  "new york": "America/New_York",
  "miami": "America/New_York",
  "atlanta": "America/New_York",
  "chicago": "America/Chicago",
  "dallas": "America/Chicago",
  "houston": "America/Chicago",
  "denver": "America/Denver",
  "phoenix": "America/Phoenix",
  "los angeles": "America/Los_Angeles",
  "la": "America/Los_Angeles",
  "san francisco": "America/Los_Angeles",
  "seattle": "America/Los_Angeles",
  "las vegas": "America/Los_Angeles",

  // 🇬🇧 United Kingdom
  "uk": "Europe/London",
  "united kingdom": "Europe/London",
  "england": "Europe/London",
  "london": "Europe/London",
  "scotland": "Europe/London",
  "wales": "Europe/London",

  // 🇦🇺 Australia
  "australia": "Australia/Sydney",
  "sydney": "Australia/Sydney",
  "melbourne": "Australia/Melbourne",
  "brisbane": "Australia/Brisbane",
  "perth": "Australia/Perth",
  "adelaide": "Australia/Adelaide",

  // 🇨🇦 Canada
  "canada": "America/Toronto",
  "toronto": "America/Toronto",
  "montreal": "America/Toronto",
  "ottawa": "America/Toronto",
  "vancouver": "America/Vancouver",
  "calgary": "America/Edmonton",

  // 🇵🇭 Philippines
  "philippines": "Asia/Manila",
  "ph": "Asia/Manila",
  "manila": "Asia/Manila",
  "cebu": "Asia/Manila",
  "davao": "Asia/Manila",

  // 🇯🇵 Japan
  "japan": "Asia/Tokyo",
  "tokyo": "Asia/Tokyo",
  "osaka": "Asia/Tokyo",

  // 🇰🇷 South Korea
  "south korea": "Asia/Seoul",
  "korea": "Asia/Seoul",
  "seoul": "Asia/Seoul",

  // 🇨🇳 China
  "china": "Asia/Shanghai",
  "beijing": "Asia/Shanghai",
  "shanghai": "Asia/Shanghai",

  // 🇸🇬 Singapore
  "singapore": "Asia/Singapore",
  "sg": "Asia/Singapore",

  // 🇮🇩 Indonesia
  "indonesia": "Asia/Jakarta",
  "jakarta": "Asia/Jakarta",
  "bali": "Asia/Makassar",

  // 🇹🇭 Thailand
  "thailand": "Asia/Bangkok",
  "bangkok": "Asia/Bangkok",

  // 🇻🇳 Vietnam
  "vietnam": "Asia/Ho_Chi_Minh",
  "ho chi minh": "Asia/Ho_Chi_Minh",
  "hanoi": "Asia/Bangkok",

  // 🇲🇾 Malaysia
  "malaysia": "Asia/Kuala_Lumpur",
  "kuala lumpur": "Asia/Kuala_Lumpur",
  "kl": "Asia/Kuala_Lumpur",

  // 🇮🇳 India
  "india": "Asia/Kolkata",
  "mumbai": "Asia/Kolkata",
  "delhi": "Asia/Kolkata",
  "bangalore": "Asia/Kolkata",

  // 🇵🇰 Pakistan
  "pakistan": "Asia/Karachi",
  "karachi": "Asia/Karachi",
  "lahore": "Asia/Karachi",

  // 🇦🇪 UAE
  "uae": "Asia/Dubai",
  "dubai": "Asia/Dubai",
  "abu dhabi": "Asia/Dubai",

  // 🇸🇦 Saudi Arabia
  "saudi arabia": "Asia/Riyadh",
  "riyadh": "Asia/Riyadh",

  // 🇩🇪 Germany
  "germany": "Europe/Berlin",
  "berlin": "Europe/Berlin",
  "munich": "Europe/Berlin",

  // 🇫🇷 France
  "france": "Europe/Paris",
  "paris": "Europe/Paris",

  // 🇪🇸 Spain
  "spain": "Europe/Madrid",
  "madrid": "Europe/Madrid",
  "barcelona": "Europe/Madrid",

  // 🇮🇹 Italy
  "italy": "Europe/Rome",
  "rome": "Europe/Rome",
  "milan": "Europe/Rome",

  // 🇳🇱 Netherlands
  "netherlands": "Europe/Amsterdam",
  "amsterdam": "Europe/Amsterdam",

  // 🇵🇹 Portugal
  "portugal": "Europe/Lisbon",
  "lisbon": "Europe/Lisbon",

  // 🇧🇷 Brazil
  "brazil": "America/Sao_Paulo",
  "sao paulo": "America/Sao_Paulo",
  "rio": "America/Sao_Paulo",
  "rio de janeiro": "America/Sao_Paulo",

  // 🇲🇽 Mexico
  "mexico": "America/Mexico_City",
  "mexico city": "America/Mexico_City",

  // 🇨🇴 Colombia
  "colombia": "America/Bogota",
  "bogota": "America/Bogota",

  // 🇦🇷 Argentina
  "argentina": "America/Argentina/Buenos_Aires",
  "buenos aires": "America/Argentina/Buenos_Aires",

  // 🇿🇦 South Africa
  "south africa": "Africa/Johannesburg",
  "johannesburg": "Africa/Johannesburg",
  "cape town": "Africa/Johannesburg",

  // 🇳🇬 Nigeria
  "nigeria": "Africa/Lagos",
  "lagos": "Africa/Lagos",

  // 🇬🇭 Ghana
  "ghana": "Africa/Accra",
  "accra": "Africa/Accra",

  // 🇷🇺 Russia
  "russia": "Europe/Moscow",
  "moscow": "Europe/Moscow",

  // 🇺🇦 Ukraine
  "ukraine": "Europe/Kiev",
  "kyiv": "Europe/Kiev",

  // 🇳🇿 New Zealand
  "new zealand": "Pacific/Auckland",
  "auckland": "Pacific/Auckland",
};

function resolveTimezone(location) {
  const key = location.trim().toLowerCase();
  const tz = LOCATION_MAP[key];
  if (!tz) {
    console.warn(`⚠️  Unknown location "${location}" — falling back to UTC. Check timezones.js to add it.`);
    return "UTC";
  }
  return tz;
}

module.exports = { resolveTimezone, LOCATION_MAP };
