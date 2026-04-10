const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");

const app = express();
app.use(express.json());

// ================= DISCORD BOT =================

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

// ================= BANCO =================

let keys = {};
let logs = [];
let requests = {};

// ================= ANTI SPAM =================

function checkSpam(user) {
    if (!requests[user]) {
        requests[user] = { count: 1, time: Date.now() };
        return false;
    }

    let data = requests[user];

    if (Date.now() - data.time > 10000) {
        requests[user] = { count: 1, time: Date.now() };
        return false;
    }

    data.count++;

    if (data.count > 10) {
        return true;
    }

    return false;
}

// ================= GERAR KEY =================

app.get("/gerar", (req, res) => {
    const key = "TSW-" + Math.random().toString(36).substring(2, 10).toUpperCase();

    keys[key] = {
        hwid: null,
        expires: null
    };

    res.json({ key });
});

app.get("/gerar/tempo", (req, res) => {
    const duracao = parseInt(req.query.duracao);

    if (!duracao) {
        return res.json({ status: "erro", msg: "use ?duracao=tempo" });
    }

    const key = "TSW-" + Math.random().toString(36).substring(2, 10).toUpperCase();

    keys[key] = {
        hwid: null,
        expires: Date.now() + duracao * 1000
    };

    res.json({ key, tempo: duracao + "s" });
});

// ================= VERIFY =================

app.post("/verify", (req, res) => {
    const { key, hwid } = req.body;

    if (!key || !hwid) {
        return res.json({ status: "error" });
    }

    if (checkSpam(hwid)) {
        return res.json({ status: "spam" });
    }

    if (!keys[key]) {
        return res.json({ status: "invalid" });
    }

    if (keys[key].expires && Date.now() > keys[key].expires) {
        return res.json({ status: "expired" });
    }

    if (!keys[key].hwid) {
        keys[key].hwid = hwid;

        logs.push({
            key,
            hwid,
            time: new Date().toLocaleString()
        });

        return res.json({ status: "success" });
    }

    if (keys[key].hwid === hwid) {
        return res.json({ status: "success" });
    }

    return res.json({ status: "locked" });
});

// ================= RESET =================

app.post("/reset", (req, res) => {
    const { key } = req.body;

    if (!keys[key]) {
        return res.json({ status: "invalid" });
    }

    keys[key].hwid = null;

    return res.json({ status: "resetado" });
});

// ================= LOGS =================

app.get("/logs", (req, res) => {
    res.json(logs);
});

// ================= BOT COMANDOS =================

client.on("messageCreate", async (msg) => {
    if (msg.author.bot) return;

    if (msg.content === "!gerar") {
        const key = "TSW-" + Math.random().toString(36).substring(2, 10).toUpperCase();

        keys[key] = {
            hwid: null,
            expires: null
        };

        msg.reply("🔑 Key: " + key);
    }

    if (msg.content.startsWith("!reset")) {
        const args = msg.content.split(" ");
        const key = args[1];

        if (!keys[key]) {
            return msg.reply("❌ Key inválida");
        }

        keys[key].hwid = null;
        msg.reply("🔄 Key resetada");
    }
});

// ================= TESTE =================

app.get("/", (req, res) => {
    res.send("API PRO ONLINE 🔥");
});

// ================= START =================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("API rodando na porta " + PORT);
});

client.login(process.env.DISCORD_TOKEN);
