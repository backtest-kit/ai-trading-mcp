import { ExtractedData, FieldMapping } from "./ParseFormat.model";
import { ScraperMessage } from "./ScraperMessage.model";

export interface ParserMessageBase<M extends FieldMapping> extends ScraperMessage {
  data: ExtractedData<M> | null;
}

export interface ParserMessage<M extends FieldMapping, T extends string>
  extends ParserMessageBase<M> {
  type: T;
}
