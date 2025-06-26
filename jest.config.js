module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    // if you have path aliases in tsconfig.json, you need to map them here
    // e.g., "@/(.*)": "<rootDir>/src/$1"
  },
};
