
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import readline from "readline";
import { writeFile } from "fs/promises";
import qrcodeTerminal from "qrcode-terminal";
import { CC_TELEGRAM_API_HASH, CC_TELEGRAM_API_ID } from "../config/params";
import { getArgs } from "../helpers/getArgs";

const main = async () => {

    const { values } = getArgs();

    if (!values.session) {
        return;
    }

    const stringSession = new StringSession("");

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const client = new TelegramClient(stringSession, CC_TELEGRAM_API_ID, CC_TELEGRAM_API_HASH, {
        connectionRetries: 5,
        systemVersion: "Windows 10",
        deviceModel: "Desktop",
        appVersion: "1.0.0",
    });

    await client.connect();

    await client.signInUserWithQrCode(
        { apiId: CC_TELEGRAM_API_ID, apiHash: CC_TELEGRAM_API_HASH },
        {
            qrCode: async ({ token }) => {
                const url = `tg://login?token=${token.toString("base64url")}`;
                console.clear();
                console.log("Scan this QR code in Telegram app (Settings -> Devices -> Link Desktop Device):\n");
                qrcodeTerminal.generate(url, { small: true });
            },
            password: async () =>
                new Promise((resolve) =>
                    rl.question("Enter your 2FA password: ", resolve)
                ),
            onError: async (err) => {
                console.error(err.message);
                return false;
            },
        }
    );

    console.log("Connected!");
    {
        const sessionString = stringSession.save();
        await writeFile("./session.txt", sessionString, "utf-8");
    }
    console.log("Session saved to ./session.txt");

    rl.close();
};

main();
