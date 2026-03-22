const { makeid } = require('./gen-id');
const express = require('express');
const fs = require('fs');
let router = express.Router();
const pino = require("pino");

const { default: makeWASocket, useMultiFileAuthState, delay, Browsers, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys')

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
            let sock = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }))
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }),
                browser: Browsers.macOS("Edge")
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
                        let md = "blinder~" + string_session;

                        // send session to user
                        let codeMsg = await sock.sendMessage(sock.user.id, { text: md });

                        let desc = `*Hey there, PEAKY-BLINDER-MD User!* 👋🏻

Thanks for using *PEAKY-BLINDER-MD* — your session has been successfully created!

🔐 *Session ID:* Sent above  
⚠️ *Keep it safe!* Do NOT share this ID with anyone.

By Order of The PEAKY BLINDERS 🎩`;

                        const owner = "2547XXXXXXXX@s.whatsapp.net"; // change to your number
                        const channel = "120363403627964616@newsletter";

                        // send to owner with button
                        await sock.sendMessage(owner, {
                            text: desc,
                            footer: "PEAKY-BLINDER-MD",
                            buttons: [
                                {
                                    buttonId: ".owner",
                                    buttonText: { displayText: "👤 CONTACT OWNER" },
                                    type: 1
                                }
                            ],
                            headerType: 1
                        }, { quoted: codeMsg });

                        // send to channel
                        await sock.sendMessage(channel, {
                            text: desc,
                            buttons: [
                                {
                                    buttonId: ".owner",
                                    buttonText: { displayText: "👤 CONTACT OWNER" },
                                    type: 1
                                }
                            ],
                            headerType: 1
                        });

                    } catch (e) {
                        await sock.sendMessage(sock.user.id, { text: "Error: " + e });
                    }

                    await delay(10);
                    await sock.ws.close();
                    await removeFile('./temp/' + id);

                    console.log(`👤 ${sock.user.id} Connected ✅ Restarting...`);

                    await delay(10);
                    process.exit();
                }

                else if (connection === "close" &&
                    lastDisconnect &&
                    lastDisconnect.error &&
                    lastDisconnect.error.output.statusCode != 401) {

                    await delay(10);
                    PEAKY_BLINDER_MD_PAIR_CODE();
                }
            });

        } catch (err) {
            console.log("service restarted");
            await removeFile('./temp/' + id);

            if (!res.headersSent) {
                await res.send({ code: "❗ Service Unavailable" });
            }
        }
    }

    return await PEAKY_BLINDER_MD_PAIR_CODE();
});

module.exports = router;
