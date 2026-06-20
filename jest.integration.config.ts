import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/integration/**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          moduleResolution: "node",
          module: "commonjs",
        },
      },
    ],
  },
  testTimeout: 30000,
  // I test di integrazione condividono lo stesso database PostgreSQL:
  // vanno eseguiti in serie per evitare interferenze tra suite
  // (es. pollOnce() del worker che preleva job PENDING creati da altri test).
  maxWorkers: 1,
};

export default config;
