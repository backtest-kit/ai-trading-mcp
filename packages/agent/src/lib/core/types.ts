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

export const TYPES = {
    ...baseServices,
    ...controllerServices,
    ...markdownServices,
}

export default TYPES;
