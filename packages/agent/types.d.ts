import { IMCPContext, IMCPMessage } from 'backtest-kit';

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

declare class StatusControllerService {
    private readonly loggerService;
    getStatus: (context: IMCPContext, when: Date, mcpName: string) => Promise<IMCPMessage[]>;
}

declare const ioc: {
    statusControllerService: StatusControllerService;
    loggerService: LoggerService;
};
declare global {
    var agent: typeof ioc;
}
