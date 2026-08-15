import { inject } from "../../core/di";
import LoggerService from "../base/LoggerService";
import TYPES from "../../core/types";
import { getTelegram } from "../../../config/telegram";
import { ScraperMessage } from "../../../model/ScraperMessage.model";
import { execpool, pickDocuments } from "functools-kit";
import { Api } from "telegram";
import sharp from "sharp";

// Целевая ширина превью: 800px — середина телеграмовской прогрессии размеров
// (320/800/1280/2560). На 320px текст мылится, ретина-размеры (1280+) для
// чтения избыточны; 800px — чёткий текст карточек при умеренном весе.
const PHOTO_THUMB_WIDTH = 800;

// Качество JPEG после ужатия. 80 — порог, ниже которого на скриншотах бирж
// начинают сыпаться тонкие цифры в таблицах позиций.
const PHOTO_JPEG_QUALITY = 80;

// Ограничение обработки фото одновременно чтобы не получить OOM на слабом железе
const MAX_EXEC = 5;

// Даем задержку чтобы кластер пришел в норму
const EXEC_DELAY = 100;

/**
 * Скачивает фото поста и ужимает его до PHOTO_THUMB_WIDTH.
 *
 * Скачиваем ВСЕГДА полный размер, без опции thumb. Телеграм отдаёт крупные
 * фото как PhotoSizeProgressive, а downloadMedia({ thumb }) на прогрессивном
 * размере возвращает пусто — из-за этого превью молча терялись, и посты со
 * скриншотами доходили до агента без картинки. Ресайз делаем на своей
 * стороне: это дороже по трафику, но детерминированно.
 *
 * @param message - Сообщение канала с фото
 * @returns JPEG-буфер ужатого превью либо null, если скачать не удалось
 */
const DOWNLOAD_MEDIA_FN = execpool(
  async (message: Api.Message): Promise<Buffer | null> => {
    const client = await getTelegram();
    const media = await client.downloadMedia(message);
    if (!media) {
      console.warn(`ScraperService download failed for message=${message.id}`);
      return null;
    }
    const source = Buffer.isBuffer(media) ? media : Buffer.from(media);
    try {
      console.warn(
        `ScraperService resize begin for message=${message.id}`
      );
      return await sharp(source)
        .rotate()
        .resize({ width: PHOTO_THUMB_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: PHOTO_JPEG_QUALITY })
        .toBuffer();
    } catch (error) {
      // Ужатие — оптимизация, а не обязательный шаг: пусть агент получит
      // тяжёлый оригинал, чем ничего
      console.warn(
        `ScraperService resize failed for message=${message.id}, using original`,
        error,
      );
      return source;
    }
  },
  {
    maxExec: MAX_EXEC,
    delay: EXEC_DELAY,
  }
);

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
        photo = media ? media.toString("base64") : null;
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
        photo = media ? media.toString("base64") : null;
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
