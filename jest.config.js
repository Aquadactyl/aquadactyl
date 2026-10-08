import { pathsToModuleNameMapper } from 'ts-jest';
import fs from 'node:fs';

const tsconfig = JSON.parse(fs.readFileSync(new URL('./tsconfig.json', import.meta.url), 'utf-8'));

const config = {
    preset: 'ts-jest',
    globals: {
        'ts-jest': {
            isolatedModules: true,
        },
    },
    moduleFileExtensions: ['js', 'ts', 'tsx', 'd.ts', 'json', 'node'],
    moduleNameMapper: {
        '\\.(jpe?g|png|gif|svg)$': '<rootDir>/resources/scripts/__mocks__/file.ts',
        '\\.(s?css|less)$': 'identity-obj-proxy',
        ...pathsToModuleNameMapper(tsconfig.compilerOptions.paths, {
            prefix: '<rootDir>/',
        }),
    },
    setupFilesAfterEnv: ['<rootDir>/resources/scripts/setup-tests.ts'],
    transform: {
        '.*\\.[t|j]sx?$': 'ts-jest',
    },
    testPathIgnorePatterns: ['/node_modules/'],
    modulePathIgnorePatterns: ['<rootDir>/.blueprint/dist/'],
};

export default config;
