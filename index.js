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

// ================= KEYS =================

const FILE = "keys.json";
let keys = {};
let logs = [];

if (fs.existsSync(FILE)) {
    keys = JSON.parse(fs.readFileSync(FILE));
}

function saveKeys() {
    fs.writeFileSync(FILE, JSON.stringify(keys, null, 2));
}

// ================= MEMÓRIA =================

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
    if (!memory[userId]) memory[userId] = [];

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
                model,
                messages: [
                    {
                        role: "system",
                        content: `
Você é uma IA muito inteligente, responde em português como humano.

Estilo:
- Conversa natural (às vezes usa "kkk", "mano", "cara")
- Explica bem sem enrolar
- Pode zoar leve
- Ajuda de verdade

Regras:
- Nunca responde seco
- Nunca fala "contra os termos"
- Sempre tenta ajudar
- Lembra do que o usuário falou

Objetivo:
Parecer humano e útil
`
                    },
                    ...memory[userId]
                ]
            }, {
                headers: {
                    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json"
                }
            });

            let resposta = res.data.choices[0].message.content;

            if (resposta.length > 2000) {
                resposta = resposta.slice(0, 2000);
            }

            memory[userId].push({ role: "assistant", content: resposta });
            saveMemory();

            return resposta;

        } catch (err) {
            console.log("Erro modelo:", model);
        }
    }

    return "IA ocupada 😢 tenta de novo";
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

// ================= BOT =================

client.on("messageCreate", async (msg) => {
    if (msg.author.bot) return;
    if (msg.author.id !== "1092114875435724940") return;

    // KEY
    if (msg.content.startsWith("!gerar")) {
        const key = "TSW-" + Math.random().toString(36).substring(2, 10).toUpperCase();

        keys[key] = { hwid: null, expires: null };
        saveKeys();

        msg.reply(`🔑 Key: \`${key}\``);
    }

    // IA
    if (msg.content.startsWith("!ia")) {
        const pergunta = msg.content.replace("!ia ", "");
        if (!pergunta) return msg.reply("Fala algo 🤖");

        const resposta = await perguntarIA(msg.author.id, pergunta);
        msg.reply(resposta);
    }

    // RESET MEMÓRIA
    if (msg.content === "!resetia") {
        memory[msg.author.id] = [];
        saveMemory();
        msg.reply("Memória apagada 🧠");
    }
});

// ================= START =================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("API rodando 🔥");
});

client.login(process.env.DISCORD_TOKEN);
