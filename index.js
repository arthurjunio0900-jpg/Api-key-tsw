const express = require("express");
const fs = require("fs");
const { Client, GatewayIntentBits } = require("discord.js");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

// ================= IA =================

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
let logs = [];

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

// 🔑 GERAR KEY
app.get("/gerar", (req, res) => {
    const key = "TSW-" + Math.random().toString(36).substring(2, 10).toUpperCase();

    keys[key] = { hwid: null, expires: null };
    saveKeys();

    res.json({ key });
});

// ⏱️ GERAR COM TEMPO
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

// ✅ CHECK (ROBLOX)
app.get("/check", (req, res) => {
    const key = req.query.key;
    const hwid = req.query.hwid;

    if (!key || !hwid) return res.send("error");
    if (!keys[key]) return res.send("invalid");

    if (keys[key].expires && Date.now() > keys[key].expires) {
        return res.send("expired");
    }

    if (!keys[key].hwid) {
        keys[key].hwid = hwid;

        logs.push({
            key,
            hwid,
            time: new Date().toLocaleString()
        });

        saveKeys();
        return res.send("success");
    }

    if (keys[key].hwid === hwid) {
        return res.send("success");
    }

    return res.send("locked");
});

// 🔒 VERIFY (API)
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

// 🔄 RESET
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
    if (msg.author.id === "1092114875435724940") {

        // 🔑 GERAR
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

            return msg.reply(`🔑 Key: \`${key}\`\n⏱️ Tempo: ${t}`);
        }

        // 🔄 RESET
        if (msg.content.startsWith("!reset")) {

            const key = msg.content.split(" ")[1];

            if (!key || !keys[key]) {
                return msg.reply("❌ Key inválida");
            }

            keys[key].hwid = null;
            saveKeys();

            return msg.reply("🔄 Resetada");
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

            return msg.reply(texto);
        }
    }

    // 🤖 IA
    if (msg.content.startsWith("!ia")) {

        const pergunta = msg.content.replace("!ia", "").trim();

        if (!pergunta) {
            return msg.reply("❌ Digita algo mano\nEx: !ia como fazer script");
        }

        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "Você é uma IA brasileira estilo gamer, responde simples e direto."
                    },
                    {
                        role: "user",
                        content: pergunta
                    }
                ]
            });

            let reply = response.choices[0].message.content;

            msg.reply(reply.slice(0, 2000));

        } catch (err) {
            console.log(err);
            msg.reply("Erro na IA 😢");
        }
    }
});

// ================= START =================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("API rodando na porta " + PORT);
});

client.login(process.env.DISCORD_TOKEN);
