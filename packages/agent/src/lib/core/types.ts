const baseServices = {
    loggerService: Symbol('loggerService'),
    scraperService: Symbol('scraperService'),
};

const controllerServices = {
    statusControllerService: Symbol('statusControllerService'),
}

export const TYPES = {
    ...baseServices,
    ...controllerServices,
}

export default TYPES;
