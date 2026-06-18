const { makeid } = require('./gen-id');
const express = require('express');
const fs = require('fs');
let router = express.Router();
const pino = require("pino");
const { default: makeWASocket, useMultiFileAuthState, delay, Browsers, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const { upload } = require('./mega');

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number;
    async function PEAKY_BLINDER_MD_PAIR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);
        try {
            var items = ["Edge"];
            function selectRandomItem(array) {
                var randomIndex = Math.floor(Math.random() * array.length);
                return array[randomIndex];
            }
            var randomItem = selectRandomItem(items);

            let sock = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                generateHighQualityLinkPreview: true,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                syncFullHistory: false,
                browser: Browsers.macOS(randomItem)
            });
            if (!sock.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await sock.requestPairingCode(num);
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }
            sock.ev.on('creds.update', saveCreds);
            sock.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;
                if (connection == "open") {
                    await delay(5000);
                    let rf = __dirname + `/temp/${id}/creds.json`;
                    try {
                        const mega_url = await upload(fs.createReadStream(rf), `${sock.user.id}.json`);
                        const string_session = mega_url.replace('https://mega.nz/file/', '');
                        const sessionId = "blinder~" + string_session;

                        // ---------- 1. Send raw session ID ----------
                        await sock.sendMessage(sock.user.id, { text: sessionId });

                        // ---------- 2. Dual-bot description ----------
                        const descriptionText = `*🔗 SESSION LINKED — DUAL BOT MODE 🔗*

*POWER. LOYALTY. LEGACY.*

This session ID is now successfully generated and works for BOTH bots simultaneously:

┌─────────────────────────────────┐
│  🤝 SHARED SESSION ACTIVE      │
│  ✅ One ID. Two Bots. One Crew.│
└─────────────────────────────────┘

*📱 DEVICE:* ${sock.user.id}
*🔑 SESSION ID:* Sent above ☝️
*⚠️ KEEP THIS SECURE — DO NOT SHARE*

━━━━━━━━━━━━━━━━━━━━━━━━
*BOTS USING THIS SESSION:*
▸ *PEAKY BLINDERS MD* 🎩
  (By Thomas-shelby001)
▸ *BEAMER XMD* ⚡
  (Next Generation Bot)
━━━━━━━━━━━━━━━━━━━━━━━━

*⚠️ IMPORTANT TIP:*
If you run BOTH bots online at the exact same time using this one session, WhatsApp WILL disconnect the older one. 
Keep only ONE bot active at a time, or swap the credentials between them when switching.

*WE DON'T FOLLOW RULES.*
*WE MAKE THEM.*

━━━━━━━━━━━━━━━━━━━━━━━━
*👥 JOIN THE EMPIRE:*
📢 Channel: https://whatsapp.com/channel/0029VbAuEfj29754YgFtRf33
💻 GitHub:
▸ Peaky: https://github.com/Thomas-shelby001/PEAKY-BLINDER-MD
▸ Beamer XMD: https://github.com/Thomas-shelby001/BEAMER-XMD
━━━━━━━━━━━━━━━━━━━━━━━━

> *DEVELOPED BY PEAKY BLINDERS BEAMER TEAM*
> *ONE BOT. ONE CREW. ONE EMPIRE.* 🎩⚡`;

                        // ---------- 3. Send description with BEAMER image + Channel link ----------
                        await sock.sendMessage(sock.user.id, {
                            text: descriptionText,
                            contextInfo: {
                                externalAdReply: {
                                    title: "BEAMER XMD • Peaky Blinders MD",
                                    body: "Session Generated Successfully",
                                    thumbnailUrl: "https://i.ibb.co/YBfYFFY3/beamer-1781796163575.jpg",
                                    sourceUrl: "https://whatsapp.com/channel/0029VbAuEfj29754YgFtRf33",
                                    mediaType: 1,
                                    renderLargerThumbnail: true,
                                    showAdAttribution: true
                                }
                            }
                        });

                    } catch (e) {
                        console.log("❌ Upload error:", e.message || e);
                        try {
                            await sock.sendMessage(sock.user.id, { text: `❌ Upload Failed: ${e.message || e}` });
                        } catch (sendErr) {
                            console.log("Failed to send error:", sendErr);
                        }
                    }

                    await delay(10);
                    await sock.ws.close();
                    await removeFile('./temp/' + id);
                    console.log(`👤 ${sock.user.id} 𝗖𝗼𝗻𝗻𝗲𝗰𝘁𝗲𝗱 ✅ 𝗥𝗲𝘀𝘁𝗮𝗿𝘁𝗶𝗻𝗴 𝗽𝗿𝗼𝗰𝗲𝘀𝘀...`);
                    await delay(10);
                    process.exit();
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    await delay(10);
                    PEAKY_BLINDER_MD_PAIR_CODE();
                }
            });
        } catch (err) {
            console.log("service restated");
            await removeFile('./temp/' + id);
            if (!res.headersSent) {
                await res.send({ code: "❗ Service Unavailable" });
            }
        }
    }
    return await PEAKY_BLINDER_MD_PAIR_CODE();
});

module.exports = router;
