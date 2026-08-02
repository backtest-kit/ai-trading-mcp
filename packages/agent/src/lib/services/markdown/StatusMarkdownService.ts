import fs from "fs/promises";
import { join } from "path";
import { inject } from "../../../lib/core/di";
import LoggerService from "../base/LoggerService";
import TYPES from "../../../lib/core/types";
import { IMCPContext, IMCPMessage } from "backtest-kit";
import { getMomentStamp } from "get-moment-stamp";

const IMAGE_DIR = join("./dump", "images");
const MCP_DIR = join("./dump", "mcp");

export class StatusMarkdownService {

    readonly loggerService = inject<LoggerService>(TYPES.loggerService);

    public dumpStatus = async (messages: IMCPMessage[], context: IMCPContext, when: Date): Promise<void> => {
        this.loggerService.log("statusMarkdownService dumpStatus", {
            messagesLen: messages.length,
            context,
        });
        await fs.mkdir(IMAGE_DIR, { recursive: true });
        await fs.mkdir(MCP_DIR, { recursive: true });
        let content = "";
        for (const message of messages) {
            if (message.type === "text") {
                content += message.text;
                content += "\n\n";
                continue;
            }
            await fs.writeFile(
                join(IMAGE_DIR, `${message.id}.png`),
                Buffer.from(message.data, "base64"),
            );
            content += `![${message.id}](../images/${message.id}.png)\n\n`;
        }
        const dumpIndex = getMomentStamp(when, "minute");
        await fs.writeFile(join(MCP_DIR, `${dumpIndex}.md`), content, "utf8");
    };

}

export default StatusMarkdownService;
