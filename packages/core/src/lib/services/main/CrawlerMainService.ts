import { inject } from "../../core/di";
import LoggerService from "../base/LoggerService";
import TYPES from "../../core/types";
import { getContext, getMode, listFrameSchema } from "backtest-kit";
import CrawlerService from "../core/CrawlerService";
import { getMomentStamp } from "get-moment-stamp";
import { signalJobSubject } from "../../../config/emitters";

export class CrawlerMainService {
  readonly loggerService = inject<LoggerService>(TYPES.loggerService);
  readonly crawlerService = inject<CrawlerService>(TYPES.crawlerService); 

  public crawlLiveFrame = async (when: Date) => {
    this.loggerService.log("crawlerMainService crawlLiveFrame", {
      when,
    });
    const mode = await getMode();
    if (mode === "backtest") {
      return;
    }
    const stamp = getMomentStamp(when);
    await this.crawlerService.crawlDay(stamp);
    await signalJobSubject.next();
  }

  public crawlBacktestFrame = async (when: Date) => {
    this.loggerService.log("crawlerMainService crawlFrame", {
      when,
    });
    const { frameName } = await getContext();
    const frameList = await listFrameSchema();
    const { startDate, endDate } = frameList.find((frame) => frame.frameName === frameName);
    const fromStamp = getMomentStamp(startDate);
    const toStamp = getMomentStamp(endDate);
    await this.crawlerService.crawlRange(
      fromStamp,
      toStamp,
    );
    await signalJobSubject.next();
  }
}

export default CrawlerMainService;
