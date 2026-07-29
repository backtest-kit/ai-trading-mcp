import { inject } from "../../core/di";
import LoggerService from "../base/LoggerService";
import TYPES from "../../core/types";
import { compose, queued, singleshot } from "functools-kit";
import { signalJobSubject } from "../../../config/emitters";
import SignalLogicService from "../logic/SignalLogicService";
import ParserDbService from "../db/ParserDbService";
import {
  alignToInterval,
  beginTime,
  ExecutionContextService,
  getContext,
  getMode,
  listFrameSchema,
} from "backtest-kit";
import { IParserRow } from "../../../schema/Parser.schema";
import ScreenDbService from "../db/ScreenDbService";

const RUN_IN_CONTEXT_FN = beginTime(
  async (self: SignalJobService, row: IParserRow, backtest: boolean) => {
    const when = alignToInterval(row.publishedAt, "1m");
    return await ExecutionContextService.runInContext(
      async () => {
        return await self.signalLogicService.execute(row);
      },
      {
        symbol: row.symbol,
        when,
        backtest,
      },
    );
  },
);

const RUN_BACKTEST_FN = async (self: SignalJobService, frameName: string) => {
  const frameList = await listFrameSchema();
  const { startDate, endDate } = frameList.find((frame) => frame.frameName === frameName);
  const rowList = await self.parserDbService.findAllByPublishedAt(startDate, endDate);
  for (const row of rowList) {
    if (await self.screenDbService.findByParserItem(row.id)) {
      continue;
    }
    const dto = await RUN_IN_CONTEXT_FN(self, row, true);
    await self.screenDbService.create(dto);
    await self.parserDbService.markVisited(row.id);
  }
}

const RUN_LIVE_FN = async (self: SignalJobService) => {
  const rowList = await self.parserDbService.findAllByVisited(false);
  for (const row of rowList) {
    if (await self.screenDbService.findByParserItem(row.id)) {
      continue;
    }
    try {
      const dto = await RUN_IN_CONTEXT_FN(self, row, false);
      await self.screenDbService.create(dto);
      await self.parserDbService.markVisited(row.id);
    } catch (error) {
      // A transient failure (e.g. network outage during the risk gate) must not
      // leave the row half-processed or kill the loop for the remaining rows.
      // The row stays unvisited, so the next run picks it up again.
      self.loggerService.warn("signalJobService RUN_LIVE_FN row failed, will retry", {
        rowId: row.id,
        symbol: row.symbol,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export class SignalJobService {
  readonly loggerService = inject<LoggerService>(TYPES.loggerService);
  readonly parserDbService = inject<ParserDbService>(TYPES.parserDbService);
  readonly screenDbService = inject<ScreenDbService>(TYPES.screenDbService);
  readonly signalLogicService = inject<SignalLogicService>(
    TYPES.signalLogicService,
  );

  private run = queued(async () => {
    this.loggerService.log("signalJobService run");
    const mode = await getMode();
    if (mode === "backtest") {
      const { frameName } = await getContext();
      await RUN_BACKTEST_FN(this, frameName);
      return;
    }
    if (mode === "live") {
      await RUN_LIVE_FN(this);
      return;
    }
  });

  public enable = singleshot(() => {
    this.loggerService.log("signalJobService enable");

    const unJob = signalJobSubject.subscribe(this.run);
    const unEnable = () => this.enable.clear();

    return compose(unJob, unEnable);
  });

  public disable = () => {
    this.loggerService.log("signalJobService disable");

    if (this.enable.hasValue()) {
      const lastSubscription = this.enable();
      lastSubscription();
      return;
    }
  };
}

export default SignalJobService;
