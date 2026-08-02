import { inject } from "../../core/di";
import LoggerService from "../base/LoggerService";
import TYPES from "../../core/types";
import { getTelegram } from "../../../config/telegram";
import { ScraperMessage } from "../../../model/ScraperMessage.model";
import { pickDocuments } from "functools-kit";
import { Api } from "telegram";

// Целевая ширина превью: 800px — середина телеграмовской прогрессии размеров
// (320/800/1280/2560). На 320px текст мылится, ретина-размеры (1280+) для
// чтения избыточны; 800px — чёткий текст карточек при умеренном весе.
const PHOTO_THUMB_WIDTH = 800;

// Выбирает наименьший реальный размер фото шириной >= PHOTO_THUMB_WIDTH,
// иначе наибольший доступный. Возвращает инстанс из photo.sizes — ровно то,
// что downloadMedia принимает в thumb по типам, без кастов.
const GET_PHOTO_THUMB_FN = (message: Api.Message): Api.TypePhotoSize | null => {
  if (!(message.photo instanceof Api.Photo)) {
    return null;
  }
  const candidates = message.photo.sizes.flatMap(
    (size): { size: Api.TypePhotoSize; width: number }[] => {
      if (size instanceof Api.PhotoSize) {
        return [{ size, width: size.w }];
      }
      if (size instanceof Api.PhotoSizeProgressive) {
        return [{ size, width: size.w }];
      }
      return [];
    },
  );
  if (!candidates.length) {
    return null;
  }
  candidates.sort((a, b) => a.width - b.width);
  const fit = candidates.find(({ width }) => width >= PHOTO_THUMB_WIDTH);
  return (fit ?? candidates[candidates.length - 1]).size;
};

const DOWNLOAD_MEDIA_FN = async (message: Api.Message) => {
  const client = await getTelegram();
  const thumb = GET_PHOTO_THUMB_FN(message);
  if (!thumb) {
    console.warn("ScraperService download size list failed")
    return await client.downloadMedia(message);
  }
  let media: string | Buffer | undefined;
  if (media = await client.downloadMedia(message, { thumb })) {
    return media;
  }
  console.warn("ScraperService download thumbnail failed")
  return await client.downloadMedia(message);
}

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
        const media = await DOWNLOAD_MEDIA_FN(message);
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
        const media = await DOWNLOAD_MEDIA_FN(message);
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
