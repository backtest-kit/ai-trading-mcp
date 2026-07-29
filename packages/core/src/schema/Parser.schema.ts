import mongoose, { Document, Schema } from "mongoose";

interface IParserDto {
  channel: string;
  source: string;
  messageId: number;
  publishedAt: Date;
  note: string;

  symbol: string;
  direction: "long" | "short";
  entry: { from: number; to: number };
  targets: number[];
  stoploss: number;

  content: unknown;
}

interface ParserDocument extends IParserDto, Document {
  visited: boolean;
}

interface IParserRow extends IParserDto {
  id: string;
  visited: boolean;
  createDate: Date;
  updatedDate: Date;
}

const DIRECTION_ENUM = ["long", "short"] as const;

const ParserSchema: Schema<ParserDocument> = new Schema(
  {
    channel:     { type: String, required: true, index: true },
    source:      { type: String, required: true, index: true },
    messageId:   { type: Number, required: true, index: true },
    publishedAt: { type: Date,   required: true, index: true },
    note:        { type: String, required: true },

    symbol:    { type: String, required: true, index: true },
    direction: { type: String, required: true, enum: DIRECTION_ENUM },
    entry: {
      from: { type: Number, required: true },
      to:   { type: Number, required: true },
    },
    targets:  { type: [Number], required: true },
    stoploss: { type: Number, required: true },

    content: { type: Schema.Types.Mixed, required: true },
    visited: { type: Boolean, required: true, default: false, index: true },
  },
  { timestamps: { createdAt: "createDate", updatedAt: "updatedDate" }, minimize: false }
);

ParserSchema.index({ channel: 1, messageId: 1 }, { unique: true });
ParserSchema.index({ symbol: 1, publishedAt: -1 });

const ParserModel = mongoose.model<ParserDocument>("parser-items", ParserSchema);

export { ParserModel, IParserDto, IParserRow };
