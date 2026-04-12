const express = require("express");
const fs = require("fs");
const axios = require("axios");
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

// ================= BANCO KEYS =================

const FILE = "keys.json";

let keys = {};
let logs = [];

if (fs.existsSync(FILE)) {
    keys = JSON.parse(fs.readFileSync(FILE));
}

function saveKeys() {
    fs.writeFileSync(FILE, JSON.stringify(keys, null, 2));
}

// ================= MEMÓRIA INSANA =================

const MEMORY_FILE = "memory.json";

let memory = {};

if (fs.existsSync(MEMORY_FILE)) {
    memory = JSON.parse(fs.readFileSync(MEMORY_FILE));
}

function saveMemory() {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

// ================= IA =================

async function perguntarIA(userId, pergunta) {
    if (!memory[userId]) {
        memory[userId] = [];
    }

    memory[userId].push({ role: "user", content: pergunta });

    if (memory[userId].length > 20) {
        memory[userId] = memory[userId].slice(-20);
    }

    const modelos = [
        "mistralai/mistral-7b-instruct:free",
        "openchat/openchat-7b:free",
        "gryphe/mythomist-7b:free"
    ];

    for (let model of modelos) {
        try {
            const res = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
                model: model,
                messages: [
                    {
                        role: "system",
                        content: "Você é uma IA extremamente inteligente, conversa como humano, lembra do contexto e responde de forma natural, clara e útil."
                    },
                    ...memory[userId]
                ]
            }, {
                headers: {
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json"
                }
            });

            const resposta = res.data.choices[0].message.content;

            memory[userId].push({ role: "assistant", content: resposta });
            saveMemory();

            return resposta;

        } catch (err) {
            console.log("Erro no modelo:", model);
        }
    }

    return "IA ocupada 😢 tenta novamente";
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

app.get("/gerar/tempo", (req, res) => {
    const tempo = parseInt(req.query.duracao);

    if (!tempo) return res.json({ erro: "use ?duracao=tempo" });

    const key = "TSW-" + Math.random().toString(36).substring(2, 10).toUpperCase();

    keys[key] = {
        hwid: null,
        expires: Date.now() + tempo * 1000
    };

    saveKeys();

    res.json({ key, tempo: tempo + "s" });
});

app.post("/verify", (req, res) => {
    const { key, hwid } = req.body;

    if (!key || !hwid) return res.json({ status: "error" });
    if (!keys[key]) return res.json({ status: "invalid" });

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

    // 🔐 só você
    if (msg.author.id !== "1092114875435724940") return;

    // 🔑 GERAR KEY
    if (msg.content.startsWith("!gerar")) {
        const args = msg.content.split(" ");
        const tempo = parseInt(args[1]) || 0;

        const key = "TSW-" + Math.random().toString(36).substring(2, 10).toUpperCase();

        keys[key] = {
            hwid: null,
            expires: tempo > 0 ? Date.now() + tempo * 1000 : null
        };

        saveKeys();

        let t = tempo > 0 ? tempo + "s" : "♾️ Permanente";

        msg.reply(`🔑 Key: \`${key}\`\n⏱️ Tempo: ${t}`);
    }

    // 🔄 RESET KEY
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

            let tempo = "♾️";

            if (data.expires) {
                let restante = Math.floor((data.expires - Date.now()) / 1000);
                tempo = restante > 0 ? restante + "s" : "EXPIRADA";
            }

            texto += `🔑 ${k}\n👤 ${data.hwid || "Ninguém"}\n⏱️ ${tempo}\n\n`;

            count++;
            if (count >= 5) break;
        }

        msg.reply(texto);
    }

    // 🤖 IA COM MEMÓRIA
    if (msg.content.startsWith("!ia")) {
        const pergunta = msg.content.replace("!ia ", "");

        if (!pergunta) {
            return msg.reply("Fala algo 🤖");
        }

        const resposta = await perguntarIA(msg.author.id, pergunta);
        msg.reply(resposta);
    }

    // 🧠 RESET MEMÓRIA
    if (msg.content === "!resetia") {
        memory[msg.author.id] = [];
        saveMemory();
        msg.reply("Memória apagada 🧠");
    }
});

// ================= START =================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("API rodando na porta " + PORT);
});

client.login(process.env.DISCORD_TOKEN);
