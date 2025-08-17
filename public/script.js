const chatlog = document.getElementById("chatlog");
const input = document.getElementById("user-input");

// UPS locales for validation
const UPS_LOCALES = [
  "AL","AO","AZ","BA","BD","BG","BH","BI","BM","BO","BS","CD","CI","CL","CM","CY",
  "DJ","DZ","EC","EE","EG","ET","GH","GI","GR","GT","HN","HR","IL","JO","KE","KW",
  "KY","KZ","LK","LT","LV","MA","MD","MT","MU","MW","MZ","NG","NI","NO","OM","PA",
  "PE","PK","PR","PY","QA","RO","RS","RW","SA","SE","SI","SK","TN","TZ","UA","UG",
  "UY","VE","VI","ZA","ZM","ZW","ES","IT","FR","DE","CH","BE","NL","CZ","SE","PL",
  "GB","CA","MX","AE","IN","LU","TW","CN","HK","VN","JP","KR","TH","SG","AT","PT",
  "MY","AU","DK","FI","IE","HU","NO","PH","ID","GR","AR","IL","EE","SK","RS","BA",
  "GI","MD","CY","AL","MT","BG","UA"
];

// Fuzzy match function to handle typos
function fuzzyMatch(msg, keyword) {
  msg = msg.toLowerCase();
  keyword = keyword.toLowerCase();
  return msg.includes(keyword) || msg.split(' ').some(word => word.startsWith(keyword.slice(0,3)));
}

// Append messages to chat log
function addMessage(sender, text) {
  let div = document.createElement("div");
  div.className = sender;
  div.textContent = `${sender === "user" ? "You" : "Bot"}: ${text}`;
  chatlog.appendChild(div);
  chatlog.scrollTop = chatlog.scrollHeight;

  // Voice output for bot
  if (sender === "bot") {
    const speech = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(speech);
  }
}

// Send user message
async function sendMessage() {
  const rawMsg = input.value.trim();
  if (!rawMsg) return;
  const msg = rawMsg.toLowerCase();
  addMessage("user", rawMsg);
  input.value = "";

  let reply = "🤔 Sorry, I didn’t understand. Try 'track <number>', 'tariff <country>', 'discount', or ask UPS questions.";

  // TRACKING
  if (fuzzyMatch(msg, "track")) {
    const numberMatch = msg.match(/track\s+(?:number\s+)?([a-z0-9]+)/i);
    if (numberMatch && numberMatch[1]) {
      const number = numberMatch[1];
      try {
        const res = await fetch("/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trackingNumber: number })
        });
        const data = await res.json();
        reply = data.reply;
      } catch { reply = "⚠️ Could not fetch tracking info."; }
    } else {
      reply = "❌ Please enter a valid tracking number, e.g., 'track 1Z999AA10123456784'.";
    }
  }

  // TARIFF
  else if (fuzzyMatch(msg, "tariff")) {
    const countryMatch = msg.match(/([a-zA-Z]+)$/);
    const country = countryMatch ? countryMatch[1].toUpperCase() : "";

    if (!UPS_LOCALES.includes(country)) {
      reply = `❌ Invalid country code "${country}". UPS serves 113 countries, e.g., US, HK, IL, CA...`;
    } else {
      try {
        const res = await fetch(`/tariff/${country}`);
        const data = await res.json();
        reply = data.reply;
      } catch { reply = "⚠️ Could not fetch tariff info."; }
    }
  }

  // DISCOUNTS
  else if (fuzzyMatch(msg, "discount")) {
    try {
      const res = await fetch("/discounts");
      const data = await res.json();
      reply = data.reply;
    } catch { reply = "⚠️ Could not fetch discount info."; }
  }

  // UPS info questions
  else if (fuzzyMatch(msg, "how many countries") || fuzzyMatch(msg, "ups countries")) {
    reply = `🌍 UPS serves 113 countries/locales. Examples: US, HK, IL, CA...`;
  } else if (fuzzyMatch(msg, "list ups countries") || fuzzyMatch(msg, "all countries")) {
    reply = `🌍 UPS serves 113 countries/locales:\n${UPS_LOCALES.join(", ")}`;
  }

  // Knowledge base fallback
  else {
    try {
      const res = await fetch("/kb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: msg })
      });
      const data = await res.json();
      if (data.reply) reply = data.reply;
    } catch {}
  }

  addMessage("bot", reply);
}

// Voice recognition
function startVoice() {
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = "en-US";
  recognition.start();

  recognition.onresult = function(event) {
    const voiceMsg = event.results[0][0].transcript;
    input.value = voiceMsg;
    sendMessage();
  };
}
