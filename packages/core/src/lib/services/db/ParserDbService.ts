import BaseCRUD from "../../common/BaseCRUD";
import { IParserDto, IParserRow, ParserModel } from "../../../schema/Parser.schema";
import { readTransform } from "../../../utils/readTransform";
import { inject } from "../../core/di";
import { TYPES } from "../../core/types";
import { LoggerService } from "../base/LoggerService";

export class ParserDbService extends BaseCRUD(ParserModel) {
  readonly loggerService = inject<LoggerService>(TYPES.loggerService);

  public create = async (dto: IParserDto): Promise<IParserRow> => {
    this.loggerService.log("parserDbService create", {
      channel: dto.channel,
      messageId: dto.messageId,
    });
    const filter = {
      channel: dto.channel,
      messageId: dto.messageId,
    };
    const insertOnly = {
      source: dto.source,
      publishedAt: dto.publishedAt,
      note: dto.note,
      symbol: dto.symbol,
      direction: dto.direction,
      entry: dto.entry,
      targets: dto.targets,
      stoploss: dto.stoploss,
      content: dto.content,
      visited: false,
    };
    const document = await ParserModel.findOneAndUpdate(
      filter,
      { $setOnInsert: insertOnly },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    const result = readTransform(document.toJSON()) as unknown as IParserRow;
    return result;
  };

  public findAllByVisited = async (visited: boolean): Promise<IParserRow[]> => {
    this.loggerService.log("parserDbService findAllByVisited", { visited });
    return await this.findAll({ visited }) as unknown as IParserRow[];
  };

  public findAllByPublishedAt = async (from: Date, to: Date): Promise<IParserRow[]> => {
    this.loggerService.log("parserDbService findAllByPublishedAt", { from, to });
    return await this.findAll({ publishedAt: { $gte: from, $lte: to } }) as unknown as IParserRow[];
  };

  public findLast4HourRow = async (symbol: string, when: Date): Promise<IParserRow | null> => {
    this.loggerService.log("parserDbService findLast4HourRow", { symbol, when });
    const from = new Date(when.getTime() - 4 * 60 * 60 * 1000);
    return await this.findByFilter(
      { symbol, publishedAt: { $gte: from, $lte: when } },
      { publishedAt: -1 },
    ) as unknown as IParserRow | null;
  };

  public markVisited = async (rowId: string): Promise<boolean> => {
    this.loggerService.log("parserDbService markVisited", { rowId });
    const document = await ParserModel.findByIdAndUpdate(
      rowId,
      { $set: { visited: true } },
      { new: true },
    );
    return !!document;
  };
}

export default ParserDbService;
