import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testMatch: ["<rootDir>/tests/unit/**/*.test.ts", "<rootDir>/tests/unit/**/*.test.tsx"],
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^server-only$": "<rootDir>/tests/unit/__mocks__/server-only.ts",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          moduleResolution: "node",
          module: "commonjs",
          jsx: "react-jsx",
        },
      },
    ],
  },
};

export default config;
