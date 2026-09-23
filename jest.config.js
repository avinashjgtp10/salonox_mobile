module.exports = {
  preset: "jest-expo",
  testEnvironmentOptions: { customExportConditions: ["node", "node-addons"] },
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  clearMocks: true,
};
