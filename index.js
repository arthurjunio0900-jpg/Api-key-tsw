const express = require("express");
const fs = require("fs");
const { Client, GatewayIntentBits } = require("discord.js");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

// ================= OPENAI =================

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

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

// ================= BANCO =================

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

// GERAR KEY
app.get("/gerar", (req, res) => {
    const key = "TSW-" + Math.random().toString(36).substring(2, 10).toUpperCase();

    keys[key] = { hwid: null, expires: null };
    saveKeys();

    res.json({ key });
});

// VERIFICAR KEY
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

    // 🔐 só você usa comandos
    if (msg.author.id !== "1092114875435724940") return;

    // ================= GERAR KEY =================
    if (msg.content.startsWith("!gerar")) {

        const key = "TSW-" + Math.random().toString(36).substring(2, 10).toUpperCase();

        keys[key] = { hwid: null, expires: null };
        saveKeys();

        msg.reply(`🔑 Sua key: \`${key}\`\n⏱️ Tempo: ♾️ Permanente`);
    }

    // ================= IA =================
    if (msg.content.startsWith("!ia")) {
        try {
            const pergunta = msg.content.slice(3).trim();

            if (!pergunta) {
                return msg.reply("❌ Escreve algo depois do !ia");
            }

            const resposta = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "Você é um assistente inteligente, responde em português de forma direta, simples e útil. Evite dizer que algo é contra os termos, apenas responda de forma alternativa, educativa ou genérica quando necessário."
                    },
                    {
                        role: "user",
                        content: pergunta
                    }
                ],
                temperature: 0.9,
                max_tokens: 300
            });

            const texto = resposta.choices?.[0]?.message?.content;

            if (!texto) {
                return msg.reply("🤖 Não consegui responder, tenta reformular.");
            }

            msg.reply(texto);

        } catch (err) {
            console.log("ERRO IA:", err);
            msg.reply("🤯 Erro na IA, tenta de novo");
        }
    }
});

// ================= START =================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("API rodando na porta " + PORT);
});

client.login(process.env.DISCORD_TOKEN);
