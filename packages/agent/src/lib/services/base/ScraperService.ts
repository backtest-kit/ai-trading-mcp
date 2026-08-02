import { inject } from "../../core/di";
import LoggerService from "../base/LoggerService";
import TYPES from "../../core/types";
import { getTelegram } from "../../../config/telegram";
import { ScraperMessage } from "../../../model/ScraperMessage.model";
import { pickDocuments } from "functools-kit";

export class ScraperService {
  private readonly loggerService = inject<LoggerService>(TYPES.loggerService);

  public scrapeDay = async (dto: { 
    channel: string;
    when: Date;
   }): Promise<ScraperMessage[]> => {
    this.loggerService.log("scraperService scrapeDay", {
      dto,
    });
    const client = await getTelegram();

    const dayStart = new Date(dto.when);
    dayStart.setUTCHours(0, 0, 0, 0);

    const dayEnd = new Date(dto.when);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const rows: ScraperMessage[] = [];

    for await (const message of client.iterMessages(dto.channel, {
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
      let photo: string | null = null;
      if (message.photo) {
        const media = await client.downloadMedia(message);
        photo = media ? Buffer.from(media).toString("base64") : null;
      }
      rows.push({
        id: message.id,
        content: message.message,
        channel: dto.channel,
        photo,
        date: new Date(ts),
      });
    }
    return rows;
  };

  public scrapeLast = async (dto: {
    channel: string;
    limit: number;
    offset: number;
    when: Date;
  }): Promise<ScraperMessage[]> => {
    this.loggerService.log("scraperService scrapeLast", {
      dto,
    });
    const client = await getTelegram();

    const iter = pickDocuments<ScraperMessage>(dto.limit, dto.offset);

    for await (const message of client.iterMessages(dto.channel, {
      offsetDate: Math.floor(dto.when.getTime() / 1000),
      reverse: false,
    })) {
      if (!message.message && !message.photo) {
        continue;
      }
      const ts = message.date * 1000;

      let photo: string | null = null;

      if (message.photo) {
        const media = await client.downloadMedia(message);
        photo = media ? Buffer.from(media).toString("base64") : null;
      }

      const chunk: ScraperMessage[] = [];

      chunk.push({
        id: message.id,
        content: message.message || "",
        channel: dto.channel,
        date: new Date(ts),
        photo,
      });

      if (iter(chunk).done) {
        break;
      }
    }

    return iter().rows;
  };
}

export default ScraperService;
