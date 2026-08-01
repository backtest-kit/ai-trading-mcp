import "./core/provide";
import { inject, init } from "./core/di";
import TYPES from "./core/types";

import LoggerService from "./services/base/LoggerService";
import ScraperService from "./services/base/ScraperService";

import StatusControllerService from "./services/controller/StatusControllerService";

const baseServices = {
  loggerService: inject<LoggerService>(TYPES.loggerService),
  scraperService: inject<ScraperService>(TYPES.scraperService),
};

const controllerServices = {
    statusControllerService: inject<StatusControllerService>(TYPES.statusControllerService)
};

export const ioc = {
  ...baseServices,
  ...controllerServices,
};

init();

declare global {
  var agent: typeof ioc;
}

Object.assign(globalThis, { agent: ioc });

export default ioc;
