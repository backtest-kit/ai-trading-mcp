import peerDepsExternal from "rollup-plugin-peer-deps-external";
import typescript from "@rollup/plugin-typescript";
import replace from "@rollup/plugin-replace";
import { dts } from "rollup-plugin-dts";
import path from "path";

const version = Math.floor(Math.random() * 10000)
  .toString()
  .padStart(4, '0');

export default [
  {
    input: "src/index.ts",
    output: [
      {
        file: path.join("build", "index.cjs"),
        format: "commonjs",
      },
    ],
    plugins: [
      peerDepsExternal({
        includeDependencies: true,
      }),
      replace({
        __BUILD_VERSION__: JSON.stringify(version),
      }),
      typescript({
        tsconfig: "./tsconfig.json",
        noEmit: true,
      }),
    ],
  },
  {
    input: "src/index.ts",
    output: {
      file: "./types.d.ts",
      format: "es",
    },
    plugins: [dts()],
  },
];
