import BaseCRUD from "../../common/BaseCRUD";
import { IScreenDto, IScreenRow, ScreenModel } from "../../../schema/Screen.schema";
import { readTransform } from "../../../utils/readTransform";
import { inject } from "../../core/di";
import { TYPES } from "../../core/types";
import { LoggerService } from "../base/LoggerService";

export class ScreenDbService extends BaseCRUD(ScreenModel) {
  readonly loggerService = inject<LoggerService>(TYPES.loggerService);

  public create = async (dto: IScreenDto): Promise<IScreenRow> => {
    this.loggerService.log("screenDbService create", {
      parserItemId: dto.parserItemId,
      symbol: dto.symbol,
    });
    const filter = {
      parserItemId: dto.parserItemId,
    };
    const insertOnly = {
      channel: dto.channel,
      source: dto.source,
      publishedAt: dto.publishedAt,
      symbol: dto.symbol,
      direction: dto.direction,
      entryFrom: dto.entryFrom,
      entryTo: dto.entryTo,
      targets: dto.targets,
      stoploss: dto.stoploss,
      riskSureLevel: dto.riskSureLevel,
      riskConfidence: dto.riskConfidence,
      riskAction: dto.riskAction,
      riskDescription: dto.riskDescription,
      riskReasoning: dto.riskReasoning,
      note: dto.note,
      content: dto.content,
    };
    const document = await ScreenModel.findOneAndUpdate(
      filter,
      { $setOnInsert: insertOnly },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    const result = readTransform(document.toJSON()) as unknown as IScreenRow;
    return result;
  };

  public findByParserItem = async (parserItemId: string): Promise<IScreenRow | null> => {
    this.loggerService.log("screenDbService findByParserItem", { parserItemId });
    return await this.findByFilter({ parserItemId }) as unknown as IScreenRow | null;
  };

  public findLast4HourRow = async (symbol: string, when: Date): Promise<IScreenRow | null> => {
    this.loggerService.log("screenDbService findLast4HourRow", { symbol, when });
    const from = new Date(when.getTime() - 4 * 60 * 60 * 1000);
    return await this.findByFilter(
      { symbol, publishedAt: { $gte: from, $lte: when } },
      { publishedAt: -1 },
    ) as unknown as IScreenRow | null;
  };
}

export default ScreenDbService;
