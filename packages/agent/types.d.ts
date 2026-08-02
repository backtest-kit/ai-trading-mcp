import { IMCPMessage, IMCPContext } from 'backtest-kit';

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
    photo: string | null;
}

declare class ScraperService {
    private readonly loggerService;
    scrapeDay: (dto: {
        channel: string;
        when: Date;
    }) => Promise<ScraperMessage[]>;
    scrapeLast: (dto: {
        channel: string;
        limit: number;
        offset: number;
        when: Date;
    }) => Promise<ScraperMessage[]>;
}

declare class StatusMarkdownService {
    readonly loggerService: LoggerService;
    dumpStatus: (messages: IMCPMessage[]) => Promise<void>;
}

declare class StatusControllerService {
    readonly loggerService: LoggerService;
    readonly scraperService: ScraperService;
    readonly statusMarkdownService: StatusMarkdownService;
    getStatus: (context: IMCPContext, when: Date, mcpName: string) => Promise<IMCPMessage[]>;
}

declare const ioc: {
    statusMarkdownService: StatusMarkdownService;
    statusControllerService: StatusControllerService;
    loggerService: LoggerService;
    scraperService: ScraperService;
};
declare global {
    var agent: typeof ioc;
}
