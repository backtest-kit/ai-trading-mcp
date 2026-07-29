import { inject } from "../../../lib/core/di";
import LoggerService from "../base/LoggerService";
import TYPES from "../../../lib/core/types";
import CryptoYodaScreenService from "../screen/CryptoYodaScreenService";
import ScraperService from "../core/ScraperService";
import ParserDbService from "../db/ParserDbService";
import { fromMomentStamp, getMomentStamp } from "get-moment-stamp";

type ScreenDayFn = (date: Date) => Promise<unknown[]>;
type ScreenItem<F extends ScreenDayFn> = Awaited<ReturnType<F>>[number];

const RUN_CRAWLER_FN = async <F extends readonly ScreenDayFn[]>(
  fromStamp: number,
  toStamp: number,
  ...screenDayList: F
): Promise<ScreenItem<F[number]>[]> => {
  const taskList: Promise<unknown[]>[] = [];
  for (let stamp = fromStamp; stamp <= toStamp; stamp++) {
    const day = fromMomentStamp(stamp);
    for (const screenDay of screenDayList) {
      taskList.push(screenDay(day));
    }
  }
  const resultList = await Promise.all(taskList);
  return resultList.flatMap((result) => result) as ScreenItem<F[number]>[];
};

export class CrawlerService {
  readonly loggerService = inject<LoggerService>(TYPES.loggerService);
  readonly scraperService = inject<ScraperService>(TYPES.scraperService);
  readonly cryptoYodaScreenService = inject<CryptoYodaScreenService>(TYPES.cryptoYodaScreenService);
  readonly parserDbService = inject<ParserDbService>(TYPES.parserDbService);

  public crawlDay = async (stamp: number) => {
    this.loggerService.log("crawlerService crawlDay", {
      stamp,
    });
    return await this.crawlRange(stamp, stamp);
  };

  public crawlRange = async (fromStamp: number, toStamp: number) => {
    this.loggerService.log("crawlerService crawlRange", {
      fromStamp,
      toStamp,
    });
    const screenList = await RUN_CRAWLER_FN(
      fromStamp,
      toStamp,
      this.cryptoYodaScreenService.screenDay,
    );
    for (const msg of screenList) {
      if (!msg.data) {
        this.loggerService.info("crawlerService crawlRange skip: data is null", {
          channel: msg.channel,
          messageId: msg.id,
          content: msg.content,
        });
        continue;
      }
      if (msg.type === "crypto_yoda_channel") {
        await this.parserDbService.create({
          channel: msg.channel,
          source: msg.channel,
          messageId: msg.id,
          publishedAt: msg.date,
          note: msg.content,
          symbol: `${msg.data.symbol}USDT`,
          direction: msg.data.direction,
          entry: msg.data.entry,
          targets: msg.data.targets,
          stoploss: msg.data.stoploss,
          content: msg.data,
        });
      }
    }
    return screenList;
  };
}

export default CrawlerService;
