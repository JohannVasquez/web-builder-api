/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  clearMocks: true,
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  // Supertest levanta un servidor por petición: con todos los núcleos compitiendo (por ejemplo
  // el hook de commit corriendo junto a otra suite) alguno se cortaba con "socket hang up".
  maxWorkers: '50%',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
    '!src/shared/infrastructure/prisma/generated/**',
  ],
};
