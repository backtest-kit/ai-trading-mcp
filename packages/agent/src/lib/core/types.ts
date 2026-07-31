const baseServices = {
    loggerService: Symbol('loggerService'),
};

const controllerServices = {
    statusControllerService: Symbol('statusControllerService'),
}

export const TYPES = {
    ...baseServices,
    ...controllerServices,
}

export default TYPES;
