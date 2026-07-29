import mongoose, { Document, Schema } from "mongoose";

interface IScreenDto {
  parserItemId: string;
  channel: string;
  source: string;
  publishedAt: Date;
  symbol: string;

  direction: "long" | "short";
  entryFrom: number;
  entryTo: number;
  targets: number[];
  stoploss: number;

  riskSureLevel: "low" | "low_medium" | "medium" | "medium_high" | "high";
  riskConfidence: "reliable" | "not_reliable";
  riskAction: "skip" | "follow";
  riskDescription: string;
  riskReasoning: string;

  note: string;
  content: unknown;
}

interface ScreenDocument extends IScreenDto, Document {}

interface IScreenRow extends IScreenDto {
  id: string;
  createDate: Date;
  updatedDate: Date;
}

const DIRECTION_ENUM = ["long", "short"] as const;
const RISK_SURE_LEVEL_ENUM = ["low", "low_medium", "medium", "medium_high", "high"] as const;
const RISK_CONFIDENCE_ENUM = ["reliable", "not_reliable"] as const;
const RISK_ACTION_ENUM = ["skip", "follow"] as const;

const ScreenSchema: Schema<ScreenDocument> = new Schema(
  {
    parserItemId: { type: String, required: true },
    channel:     { type: String, required: true, index: true },
    source:      { type: String, required: true, index: true },
    publishedAt: { type: Date,   required: true, index: true },
    symbol:      { type: String, required: true, index: true },

    direction:   { type: String, required: true, enum: DIRECTION_ENUM },
    entryFrom:   { type: Number, required: true },
    entryTo:     { type: Number, required: true },
    targets:     { type: [Number], required: true },
    stoploss:    { type: Number, required: true },

    riskSureLevel:   { type: String, required: true, enum: RISK_SURE_LEVEL_ENUM, index: true },
    riskConfidence:  { type: String, required: true, enum: RISK_CONFIDENCE_ENUM, index: true },
    riskAction:      { type: String, required: true, enum: RISK_ACTION_ENUM, index: true },
    riskDescription: { type: String, required: true },
    riskReasoning:   { type: String, required: true },

    note:    { type: String, required: true },
    content: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: { createdAt: "createDate", updatedAt: "updatedDate" }, minimize: false }
);

ScreenSchema.index({ parserItemId: 1 }, { unique: true });
ScreenSchema.index({ symbol: 1, publishedAt: -1 });

const ScreenModel = mongoose.model<ScreenDocument>("screen-items", ScreenSchema);

export { ScreenModel, IScreenDto, IScreenRow };
