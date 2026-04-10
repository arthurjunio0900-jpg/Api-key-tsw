const express = require("express");
const app = express();

app.use(express.json());

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

    // reset a cada 10s
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

// normal
app.get("/gerar", (req, res) => {
    const key = "TSW-" + Math.random().toString(36).substring(2, 10).toUpperCase();

    keys[key] = {
        hwid: null,
        expires: null
    };

    res.json({ key });
});

// com tempo (ex: /gerar/tempo?duracao=60)
app.get("/gerar/tempo", (req, res) => {
    const duracao = parseInt(req.query.duracao); // segundos

    if (!duracao) {
        return res.json({ status: "erro", msg: "coloque ?duracao=tempo" });
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

    // tempo expirado
    if (keys[key].expires && Date.now() > keys[key].expires) {
        return res.json({ status: "expired" });
    }

    // primeira vez
    if (!keys[key].hwid) {
        keys[key].hwid = hwid;

        logs.push({
            key,
            hwid,
            time: new Date().toLocaleString()
        });

        return res.json({ status: "success" });
    }

    // mesmo usuário
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

// ================= TESTE =================

app.get("/", (req, res) => {
    res.send("API PRO ONLINE 🔥");
});

// ================= START =================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Rodando na porta " + PORT);
});
