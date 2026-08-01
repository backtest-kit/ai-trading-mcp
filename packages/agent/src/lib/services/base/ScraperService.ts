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
    date: Date;
    limit: number;
    offset: number;
  }): Promise<ScraperMessage[]> => {
    this.loggerService.log("scraperService scrapeDay", {
      dto,
    });
    const client = await getTelegram();

    const dayStart = new Date(dto.date);
    dayStart.setUTCHours(0, 0, 0, 0);

    const dayEnd = new Date(dto.date);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const iter = pickDocuments<ScraperMessage>(dto.limit, dto.offset);

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

      const chunk: ScraperMessage[] = [];

      chunk.push({
        id: message.id,
        content: message.message,
        channel: dto.channel,
        date: new Date(ts),
      });

      if (iter(chunk).done) {
        break;
      }
    }

    return iter().rows;
  };
}

export default ScraperService;
