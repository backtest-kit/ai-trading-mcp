export type ExtractConfig<T = string> = {
    pattern: RegExp;
    group?: number;
    transform?: (raw: string, match: RegExpMatchArray) => T;
    validate?: (value: T) => boolean;
    multi?: boolean;
    optional?: boolean;
};

export type FieldMapping = {
    [key: string]: RegExp | ExtractConfig<any>;
};

export type ExtractedData<M extends FieldMapping> = {
    [K in keyof M]: M[K] extends ExtractConfig<infer R>
        ? M[K] extends { multi: true }
            ? R[]
            : R
        : M[K] extends RegExp
            ? string
            : never;
};

export type ParseFormat<T> = {
    [K in keyof T]: RegExp | ExtractConfig<T[K] extends (infer U)[] ? U : T[K]>;
};
