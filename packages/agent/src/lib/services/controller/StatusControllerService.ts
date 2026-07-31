import { inject } from "src/lib/core/di";
import LoggerService from "../base/LoggerService";
import TYPES from "src/lib/core/types";
import { IMCPContext, IMCPMessage } from "backtest-kit";

export class StatusControllerService {
    private readonly loggerService = inject<LoggerService>(TYPES.loggerService);

    public getStatus = async (context: IMCPContext, when: Date, mcpName: string): Promise<IMCPMessage[]> => {
        this.loggerService.log("statusControllerService getStatus");
        return [];
    }
}

export default StatusControllerService;
