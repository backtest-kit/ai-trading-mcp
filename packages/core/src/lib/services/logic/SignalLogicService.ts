import { inject } from "../../core/di";
import { IParserRow } from "../../../schema/Parser.schema";
import { IScreenDto } from "../../../schema/Screen.schema";
import LoggerService from "../base/LoggerService";
import TYPES from "../../core/types";
import { json } from "agent-swarm-kit";
import OutlineName from "src/enum/OutlineName";
import { RiskOutlineContract } from "src/contract/RiskOutline";

type Symbol = string;
type Direction = "short" | "long";
type Targets = number[];
type StopLoss = number;

type Args = [Symbol, Direction, Targets, StopLoss];

const RUN_OUTLINE_FN = async (row: IParserRow) => {
  const { data, error, isValid } = await json<RiskOutlineContract, Args>(
    OutlineName.RiskOutline,
    row.symbol,
    row.direction,
    row.targets,
    row.stoploss,
  );

  if (!isValid) {
    throw new Error(error);
  }

  return data;
};

export class SignalLogicService {
  readonly loggerService = inject<LoggerService>(TYPES.loggerService);

  public execute = async (row: IParserRow): Promise<IScreenDto> => {
    this.loggerService.log("signalLogicService execute", {
      rowId: row.id,
    });
    const outline = await RUN_OUTLINE_FN(row);
    console.log("Reviewed:", {
      row,
      outline,
    });
    return {
      parserItemId: row.id,
      channel: row.channel,
      source: row.source,
      publishedAt: row.publishedAt,
      symbol: row.symbol,
      direction: row.direction,
      entryFrom: row.entry.from,
      entryTo: row.entry.to,
      targets: row.targets,
      stoploss: row.stoploss,
      riskSureLevel: outline.sure_level,
      riskConfidence: outline.confidence,
      riskAction: outline.action,
      riskDescription: outline.description,
      riskReasoning: outline.reasoning,
      note: row.note,
      content: row.content,
    };
  };
}

export default SignalLogicService;
