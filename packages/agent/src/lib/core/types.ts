const baseServices = {
    loggerService: Symbol('loggerService'),
    scraperService: Symbol('scraperService'),
};

const controllerServices = {
    statusControllerService: Symbol('statusControllerService'),
}

const markdownServices = {
    statusMarkdownService: Symbol('statusMarkdownService'),
}

const historyServices = {
    telegramHistoryService: Symbol('telegramHistoryService'),
}

export const TYPES = {
    ...baseServices,
    ...controllerServices,
    ...markdownServices,
    ...historyServices,
}

export default TYPES;
