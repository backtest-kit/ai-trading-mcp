import { addExchangeSchema, IExchangeSchema } from "backtest-kit";

function addExchangeSchemaFn(exchangeSchema: IExchangeSchema) {
    addExchangeSchema(exchangeSchema)
}

declare global {
  var addExchangeSchema: typeof addExchangeSchemaFn;
}

Object.assign(globalThis, {
  addExchangeSchema: addExchangeSchemaFn,
});
