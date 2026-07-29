import { singleshot } from "functools-kit";
import { Ollama } from "ollama";
import { CC_OLLAMA_TOKEN } from "./params";

const getOllama = singleshot(
  () =>
    new Ollama({
      host: "https://ollama.com",
      headers: {
        Authorization: `Bearer ${CC_OLLAMA_TOKEN}`,
      },
    }),
);

export { getOllama };
