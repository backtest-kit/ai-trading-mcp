import { inject } from "../../core/di";
import LoggerService from "../base/LoggerService";
import TYPES from "../../core/types";
import ParserDbService from "../db/ParserDbService";
import ScreenDbService from "../db/ScreenDbService";

export class SignalMainService {
  readonly loggerService = inject<LoggerService>(TYPES.loggerService);
  readonly parserDbService = inject<ParserDbService>(TYPES.parserDbService);
  readonly screenDbService = inject<ScreenDbService>(TYPES.screenDbService);

  public getLast4HourSignal = async (symbol: string, when: Date) => {
    this.loggerService.log("signalMainService getLast4HourSignal", {
      symbol,
      when,
    });
    return await this.screenDbService.findLast4HourRow(symbol, when);
  };

  public getLast4HourScreen = async (symbol: string, when: Date) => {
    this.loggerService.log("signalMainService getLast4HourScreen", {
      symbol,
      when,
    });
    return await this.parserDbService.findLast4HourRow(symbol, when);
  };
}

export default SignalMainService;
