import { singleshot } from "functools-kit";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { CC_TELEGRAM_API_HASH, CC_TELEGRAM_API_ID } from "./params";
import { readFile } from "fs/promises";

export const getTelegram = singleshot(async () => {
    try {
        const session = await readFile("./session.txt", "utf-8");
        const stringSession = new StringSession(session);
        const client = new TelegramClient(stringSession, CC_TELEGRAM_API_ID, CC_TELEGRAM_API_HASH, {
            connectionRetries: 5,
            systemVersion: "Windows 10",
            deviceModel: "Desktop",
            appVersion: "1.0.0",
        });
        {
            await client.connect();
            await client.getMe();
        }
        return client;
    } catch (error) {
        console.error("No session found. Please run 'npm start -- --auth' to create a session.");
        throw error;
    }
});
