const express = require("express");
const fs = require("fs");
const { Client, GatewayIntentBits } = require("discord.js");

const app = express();
app.use(express.json());

// ================= DISCORD =================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once("ready", () => {
    console.log("Bot online 🔥");
});

// ================= ANTI DUPLICAÇÃO =================

let cooldown = {};

// ================= KEYS =================

const FILE = "keys.json";

let keys = {};

if (fs.existsSync(FILE)) {
    keys = JSON.parse(fs.readFileSync(FILE));
}

function saveKeys() {
    fs.writeFileSync(FILE, JSON.stringify(keys, null, 2));
}

// ================= API =================

app.get("/", (req, res) => {
    res.send("API PRO ONLINE 🔥");
});

app.get("/gerar", (req, res) => {
    const key = "TSW-" + Math.random().toString(36).substring(2, 10).toUpperCase();

    keys[key] = { hwid: null, expires: null };
    saveKeys();

    res.json({ key });
});

app.post("/verify", (req, res) => {
    const { key, hwid } = req.body;

    if (!key || !hwid) return res.json({ status: "error" });
    if (!keys[key]) return res.json({ status: "invalid" });

    if (!keys[key].hwid) {
        keys[key].hwid = hwid;
        saveKeys();
        return res.json({ status: "success" });
    }

    if (keys[key].hwid === hwid) {
        return res.json({ status: "success" });
    }

    return res.json({ status: "locked" });
});

app.post("/reset", (req, res) => {
    const { key } = req.body;

    if (!keys[key]) return res.json({ status: "invalid" });

    keys[key].hwid = null;
    saveKeys();

    res.json({ status: "resetado" });
});

// ================= BOT =================

client.on("messageCreate", async (msg) => {
    if (msg.author.bot) return;

    // 🔐 SÓ VOCÊ
    if (msg.author.id !== "1092114875435724940") return;

    // 🚫 ANTI DUPLICAÇÃO
    if (cooldown[msg.author.id]) return;
    cooldown[msg.author.id] = true;

    setTimeout(() => {
        cooldown[msg.author.id] = false;
    }, 1000);

    // 🔑 GERAR KEY
    if (msg.content === "!gerar") {

        const key = "TSW-" + Math.random().toString(36).substring(2, 10).toUpperCase();

        keys[key] = {
            hwid: null,
            expires: null
        };

        saveKeys();

        msg.reply(`🔑 \`${key}\``);
    }

    // 🔄 RESET
    if (msg.content.startsWith("!reset")) {
        const key = msg.content.split(" ")[1];

        if (!key || !keys[key]) {
            return msg.reply("❌ Key inválida");
        }

        keys[key].hwid = null;
        saveKeys();

        msg.reply("🔄 Key resetada");
    }

    // 📊 PAINEL
    if (msg.content === "!painel") {

        let texto = "📊 Keys:\n\n";
        let count = 0;

        for (let k in keys) {
            const data = keys[k];

            texto += `🔑 ${k}\n👤 ${data.hwid || "Ninguém"}\n\n`;

            count++;
            if (count >= 5) break;
        }

        msg.reply(texto);
    }
});

// ================= START =================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("API rodando 🔥");
});

client.login(process.env.DISCORD_TOKEN);
