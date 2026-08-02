import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import fs from "fs";

const session = new StringSession(
  fs.readFileSync("./session.txt", "utf8").trim(),
);

const client = new TelegramClient(
  session,
  31861455,
  "ca60446c67ce250ee4e789c730163449",
  { connectionRetries: 3 },
);

await client.connect();

const dialogs = await client.getDialogs({ limit: 200 });

for (const d of dialogs) {
  const t = (d.title || "").toLowerCase();
  if (t.includes("вершинин") || t.includes("будни") || t.includes("трейдер")) {
    const entity = d.entity || {};
    console.log({
        title: d.title,
        id: String(d.id),
        username: "username" in entity ? entity.username: "",
    });
  }
}
await client.disconnect();
process.exit(0);
