import { provide } from "./di";
import TYPES from "./types";

import LoggerService from "../services/base/LoggerService";
import StatusControllerService from "../services/controller/StatusControllerService";

{
    provide(TYPES.loggerService, () => new LoggerService());
}

{
    provide(TYPES.statusControllerService, () => new StatusControllerService());
}
