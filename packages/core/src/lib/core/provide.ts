import { provide } from "./di";
import TYPES from "./types";

import LoggerService from "../services/base/LoggerService";

import ParserDbService from "../services/db/ParserDbService";
import ScreenDbService from "../services/db/ScreenDbService";

import ParserService from "../services/core/ParserService";
import ScraperService from "../services/core/ScraperService";
import CryptoYodaScreenService from "../services/screen/CryptoYodaScreenService";
import CrawlerMainService from "../services/main/CrawlerMainService";

import CrawlerService from "../services/core/CrawlerService";
import SignalJobService from "../services/job/SignalJobService";
import SignalMainService from "../services/main/SignalMainService";
import SignalLogicService from "../services/logic/SignalLogicService";

{
    provide(TYPES.loggerService, () => new LoggerService());
}

{
    provide(TYPES.parserDbService, () => new ParserDbService());
    provide(TYPES.screenDbService, () => new ScreenDbService());
}

{
    provide(TYPES.scraperService, () => new ScraperService());
    provide(TYPES.crawlerService, () => new CrawlerService());
    provide(TYPES.parserService, () => new ParserService());
}

{
    provide(TYPES.signalJobService, () => new SignalJobService());
}

{
    provide(TYPES.signalLogicService, () => new SignalLogicService());
}

{
    provide(TYPES.cryptoYodaScreenService, () => new CryptoYodaScreenService());
}

{
    provide(TYPES.crawlerMainService, () => new CrawlerMainService());
    provide(TYPES.signalMainService, () => new SignalMainService());
}
