import { provide } from "./di";
import TYPES from "./types";

import LoggerService from "../services/base/LoggerService";
import ScraperService from "../services/base/ScraperService";

import StatusControllerService from "../services/controller/StatusControllerService";

{
    provide(TYPES.loggerService, () => new LoggerService());
    provide(TYPES.scraperService, () => new ScraperService());
}

{
    provide(TYPES.statusControllerService, () => new StatusControllerService());
}
