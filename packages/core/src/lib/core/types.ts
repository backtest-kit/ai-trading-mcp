const baseServices = {
    loggerService: Symbol('loggerService'),
};

const dbServices = {
    parserDbService: Symbol('parserDbService'),
    screenDbService: Symbol('screenDbService'),
}

const coreServices = {
    scraperService: Symbol('scraperService'),
    crawlerService: Symbol('crawlerService'),
    parserService: Symbol('parserService'),
}

const jobServices = {
    signalJobService: Symbol('signalJobService'),
}

const logicServices = {
    signalLogicService: Symbol('signalLogicService'),
}

const screenServices = {
    cryptoYodaScreenService: Symbol('cryptoYodaScreenService'),
}

const mainServices = {
    crawlerMainService: Symbol('crawlerMainService'),
    signalMainService: Symbol('signalMainService'),
}

export const TYPES = {
    ...baseServices,
    ...dbServices,
    ...coreServices,
    ...jobServices,
    ...logicServices,
    ...screenServices,
    ...mainServices,
}

export default TYPES;
