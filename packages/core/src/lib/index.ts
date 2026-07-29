import "./core/provide";
import { inject, init } from "./core/di";
import TYPES from "./core/types";

import LoggerService from "./services/base/LoggerService";

import ScraperService from "./services/core/ScraperService";
import ParserService from "./services/core/ParserService";
import CryptoYodaScreenService from "./services/screen/CryptoYodaScreenService";

import ParserDbService from "./services/db/ParserDbService";
import ScreenDbService from "./services/db/ScreenDbService";
import CrawlerMainService from "./services/main/CrawlerMainService";
import CrawlerService from "./services/core/CrawlerService";
import SignalJobService from "./services/job/SignalJobService";
import SignalMainService from "./services/main/SignalMainService";
import SignalLogicService from "./services/logic/SignalLogicService";

const baseServices = {
  loggerService: inject<LoggerService>(TYPES.loggerService),
};

const dbServices = {
  parserDbService: inject<ParserDbService>(TYPES.parserDbService),
  screenDbService: inject<ScreenDbService>(TYPES.screenDbService),
};

const jobServices = {
  signalJobService: inject<SignalJobService>(TYPES.signalJobService),
};

const logicServices = {
  signalLogicService: inject<SignalLogicService>(TYPES.signalLogicService),
};

const coreServices = {
  scraperService: inject<ScraperService>(TYPES.scraperService),
  crawlerService: inject<CrawlerService>(TYPES.crawlerService),
  parserService: inject<ParserService>(TYPES.parserService),
};

const screenServices = {
  cryptoYodaScreenService: inject<CryptoYodaScreenService>(TYPES.cryptoYodaScreenService),
};

const mainServices = {
  crawlerMainService: inject<CrawlerMainService>(TYPES.crawlerMainService),
  signalMainService: inject<SignalMainService>(TYPES.signalMainService),
};

export const ioc = {
  ...baseServices,
  ...coreServices,
  ...dbServices,
  ...jobServices,
  ...logicServices,
  ...screenServices,
  ...mainServices,
};

init();

declare global {
  var core: typeof ioc;
}

Object.assign(globalThis, { core: ioc });

ioc.signalJobService.enable();

export default ioc;
