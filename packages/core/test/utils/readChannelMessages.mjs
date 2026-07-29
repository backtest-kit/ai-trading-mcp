import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const readChannelMessages = async (channel) => {
    const filePath = path.resolve(__dirname, "..", "data", `${channel}.json`);
    const raw = await readFile(filePath, "utf-8");
    const rows = JSON.parse(raw);
    return rows.map((r) => ({ ...r, date: new Date(r.date) }));
};

export default readChannelMessages;
