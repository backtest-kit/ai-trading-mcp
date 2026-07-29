import { IExchangeSchema } from 'backtest-kit';
import * as mongoose from 'mongoose';
import * as functools_kit from 'functools-kit';

interface RiskOutlineParams {
    symbol: string;
    publishedAt: Date;
    exchangeName: string;
    direction: "short" | "long";
    targets: number[];
    stoploss: number;
}
declare function runRiskOutlineFn({ symbol, direction, targets, stoploss, publishedAt, exchangeName, }: RiskOutlineParams): Promise<{
    action: "skip" | "follow";
    sure_level: "high" | "medium" | "low" | "low_medium" | "medium_high";
    confidence: "reliable" | "not_reliable";
    description: string;
    reasoning: string;
}>;
declare global {
    var runRiskOutline: typeof runRiskOutlineFn;
}

declare function addExchangeSchemaFn(exchangeSchema: IExchangeSchema): void;
declare global {
    var addExchangeSchema: typeof addExchangeSchemaFn;
}

interface ILogger {
    log(topic: string, ...args: any[]): void;
    debug(topic: string, ...args: any[]): void;
    info(topic: string, ...args: any[]): void;
    warn(topic: string, ...args: any[]): void;
}
declare class LoggerService implements ILogger {
    private _commonLogger;
    log: (topic: string, ...args: any[]) => Promise<void>;
    debug: (topic: string, ...args: any[]) => Promise<void>;
    info: (topic: string, ...args: any[]) => Promise<void>;
    warn: (topic: string, ...args: any[]) => Promise<void>;
    setLogger: (logger: ILogger) => void;
}

interface ScraperMessage {
    id: number;
    channel: string;
    content: string;
    date: Date;
}

declare class ScraperService {
    private readonly loggerService;
    scrapeDay: (channel: string, date: Date) => Promise<ScraperMessage[]>;
}

type ExtractConfig<T = string> = {
    pattern: RegExp;
    group?: number;
    transform?: (raw: string, match: RegExpMatchArray) => T;
    validate?: (value: T) => boolean;
    multi?: boolean;
    optional?: boolean;
};
type FieldMapping = {
    [key: string]: RegExp | ExtractConfig<any>;
};
type ExtractedData<M extends FieldMapping> = {
    [K in keyof M]: M[K] extends ExtractConfig<infer R> ? M[K] extends {
        multi: true;
    } ? R[] : R : M[K] extends RegExp ? string : never;
};
type ParseFormat<T> = {
    [K in keyof T]: RegExp | ExtractConfig<T[K] extends (infer U)[] ? U : T[K]>;
};

interface ParserMessageBase<M extends FieldMapping> extends ScraperMessage {
    data: ExtractedData<M> | null;
}
interface ParserMessage<M extends FieldMapping, T extends string> extends ParserMessageBase<M> {
    type: T;
}

declare class ParserService {
    private readonly loggerService;
    parseDay: <M extends FieldMapping>(messages: ScraperMessage[], format: M) => Promise<ParserMessageBase<M>[]>;
}

declare const CHANNEL_NAME: "crypto_yoda_channel";
type SignalFields = {
    symbol: string;
    direction: "short" | "long";
    entry: {
        from: number;
        to: number;
    };
    targets: number[];
    stoploss: number;
};
declare const SIGNAL_FORMAT: ParseFormat<SignalFields>;
declare class CryptoYodaScreenService {
    private readonly loggerService;
    private readonly parserService;
    private readonly scraperService;
    parseDay: (scraperList: ScraperMessage[]) => Promise<ParserMessage<typeof SIGNAL_FORMAT, typeof CHANNEL_NAME>[]>;
    screenDay: (date: Date) => Promise<ParserMessage<ParseFormat<SignalFields>, "crypto_yoda_channel">[]>;
}

interface IParserDto {
    channel: string;
    source: string;
    messageId: number;
    publishedAt: Date;
    note: string;
    symbol: string;
    direction: "long" | "short";
    entry: {
        from: number;
        to: number;
    };
    targets: number[];
    stoploss: number;
    content: unknown;
}
interface IParserRow extends IParserDto {
    id: string;
    visited: boolean;
    createDate: Date;
    updatedDate: Date;
}

declare const ParserDbService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly TargetModel: mongoose.Model<any>;
    create(dto: object): Promise<any>;
    update(id: string, dto: object): Promise<any>;
    findById(id: string): Promise<any>;
    findByFilter(filterData: object, sort?: object): Promise<any>;
    findAll(filterData?: object, limit?: number): Promise<any[]>;
    iterate(filterData?: object, sort?: object): AsyncGenerator<any, void, unknown>;
    paginate(filterData: object, pagination: {
        limit: number;
        offset: number;
    }, sort?: object): Promise<{
        rows: any[];
        total: number;
    }>;
}) & Omit<{
    new (TargetModel: mongoose.Model<any>): {
        readonly loggerService: LoggerService;
        readonly TargetModel: mongoose.Model<any>;
        create(dto: object): Promise<any>;
        update(id: string, dto: object): Promise<any>;
        findById(id: string): Promise<any>;
        findByFilter(filterData: object, sort?: object): Promise<any>;
        findAll(filterData?: object, limit?: number): Promise<any[]>;
        iterate(filterData?: object, sort?: object): AsyncGenerator<any, void, unknown>;
        paginate(filterData: object, pagination: {
            limit: number;
            offset: number;
        }, sort?: object): Promise<{
            rows: any[];
            total: number;
        }>;
    };
}, "prototype">;
declare class ParserDbService extends ParserDbService_base {
    readonly loggerService: LoggerService;
    create: (dto: IParserDto) => Promise<IParserRow>;
    findAllByVisited: (visited: boolean) => Promise<IParserRow[]>;
    findAllByPublishedAt: (from: Date, to: Date) => Promise<IParserRow[]>;
    findLast4HourRow: (symbol: string, when: Date) => Promise<IParserRow | null>;
    markVisited: (rowId: string) => Promise<boolean>;
}

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
interface IScreenRow extends IScreenDto {
    id: string;
    createDate: Date;
    updatedDate: Date;
}

declare const ScreenDbService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly TargetModel: mongoose.Model<any>;
    create(dto: object): Promise<any>;
    update(id: string, dto: object): Promise<any>;
    findById(id: string): Promise<any>;
    findByFilter(filterData: object, sort?: object): Promise<any>;
    findAll(filterData?: object, limit?: number): Promise<any[]>;
    iterate(filterData?: object, sort?: object): AsyncGenerator<any, void, unknown>;
    paginate(filterData: object, pagination: {
        limit: number;
        offset: number;
    }, sort?: object): Promise<{
        rows: any[];
        total: number;
    }>;
}) & Omit<{
    new (TargetModel: mongoose.Model<any>): {
        readonly loggerService: LoggerService;
        readonly TargetModel: mongoose.Model<any>;
        create(dto: object): Promise<any>;
        update(id: string, dto: object): Promise<any>;
        findById(id: string): Promise<any>;
        findByFilter(filterData: object, sort?: object): Promise<any>;
        findAll(filterData?: object, limit?: number): Promise<any[]>;
        iterate(filterData?: object, sort?: object): AsyncGenerator<any, void, unknown>;
        paginate(filterData: object, pagination: {
            limit: number;
            offset: number;
        }, sort?: object): Promise<{
            rows: any[];
            total: number;
        }>;
    };
}, "prototype">;
declare class ScreenDbService extends ScreenDbService_base {
    readonly loggerService: LoggerService;
    create: (dto: IScreenDto) => Promise<IScreenRow>;
    findByParserItem: (parserItemId: string) => Promise<IScreenRow | null>;
    findLast4HourRow: (symbol: string, when: Date) => Promise<IScreenRow | null>;
}

declare class CrawlerService {
    readonly loggerService: LoggerService;
    readonly scraperService: ScraperService;
    readonly cryptoYodaScreenService: CryptoYodaScreenService;
    readonly parserDbService: ParserDbService;
    crawlDay: (stamp: number) => Promise<ParserMessage<ParseFormat<{
        symbol: string;
        direction: "short" | "long";
        entry: {
            from: number;
            to: number;
        };
        targets: number[];
        stoploss: number;
    }>, "crypto_yoda_channel">[]>;
    crawlRange: (fromStamp: number, toStamp: number) => Promise<ParserMessage<ParseFormat<{
        symbol: string;
        direction: "short" | "long";
        entry: {
            from: number;
            to: number;
        };
        targets: number[];
        stoploss: number;
    }>, "crypto_yoda_channel">[]>;
}

declare class CrawlerMainService {
    readonly loggerService: LoggerService;
    readonly crawlerService: CrawlerService;
    crawlLiveFrame: (when: Date) => Promise<void>;
    crawlBacktestFrame: (when: Date) => Promise<void>;
}

declare class SignalLogicService {
    readonly loggerService: LoggerService;
    execute: (row: IParserRow) => Promise<IScreenDto>;
}

declare class SignalJobService {
    readonly loggerService: LoggerService;
    readonly parserDbService: ParserDbService;
    readonly screenDbService: ScreenDbService;
    readonly signalLogicService: SignalLogicService;
    private run;
    enable: (() => (...args: any[]) => any) & functools_kit.ISingleshotClearable<() => (...args: any[]) => any>;
    disable: () => void;
}

declare class SignalMainService {
    readonly loggerService: LoggerService;
    readonly parserDbService: ParserDbService;
    readonly screenDbService: ScreenDbService;
    getLast4HourSignal: (symbol: string, when: Date) => Promise<IScreenRow>;
    getLast4HourScreen: (symbol: string, when: Date) => Promise<IParserRow>;
}

declare const ioc: {
    crawlerMainService: CrawlerMainService;
    signalMainService: SignalMainService;
    cryptoYodaScreenService: CryptoYodaScreenService;
    signalLogicService: SignalLogicService;
    signalJobService: SignalJobService;
    parserDbService: ParserDbService;
    screenDbService: ScreenDbService;
    scraperService: ScraperService;
    crawlerService: CrawlerService;
    parserService: ParserService;
    loggerService: LoggerService;
};
declare global {
    var core: typeof ioc;
}
