import { inject } from "../../core/di";
import LoggerService from "../base/LoggerService";
import TYPES from "../../core/types";
import { getTelegram } from "../../../config/telegram";
import { ScraperMessage } from "../../../model/ScraperMessage.model";

export class ScraperService {
    private readonly loggerService = inject<LoggerService>(TYPES.loggerService);

    public scrapeDay = async (channel: string, date: Date): Promise<ScraperMessage[]> => {
        this.loggerService.log("scraperService scrapeDay", {
            channel,
            date,
        });
        const client = await getTelegram();

        const dayStart = new Date(date);
        dayStart.setUTCHours(0, 0, 0, 0);

        const dayEnd = new Date(date);
        dayEnd.setUTCHours(23, 59, 59, 999);

        const rows: ScraperMessage[] = [];

        for await (const message of client.iterMessages(channel, {
            offsetDate: Math.floor(dayEnd.getTime() / 1000) + 1,
            reverse: false,
        })) {
            if (!message.message) {
                continue;
            }
            const ts = message.date * 1000;
            if (ts < dayStart.getTime()) {
                break;
            }
            rows.push({
                id: message.id,
                content: message.message,
                channel,
                date: new Date(ts),

            })
        }
        return rows;
    }
}

export default ScraperService;
