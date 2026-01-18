import type { Config } from 'jest';
import nextJest from 'next/jest';

const createJestConfig = nextJest({
    // next.config.jsとテスト環境を読み込むため、Next.jsアプリのパスを指定
    dir: './',
});

const customJestConfig: Config = {
    // テスト環境をjsdomに設定
    testEnvironment: 'jsdom',

    // セットアップファイル
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

    // モジュールパスのエイリアス
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },

    // カバレッジ設定
    collectCoverageFrom: [
        'src/**/*.{js,jsx,ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/index.ts',
        '!src/app/**/*.tsx', // ページコンポーネントは除外（E2Eテストで対応）
    ],

    // カバレッジしきい値（初期は無効化、テスト追加後に有効化）
    // coverageThreshold: {
    //   global: {
    //     branches: 80,
    //     functions: 80,
    //     lines: 80,
    //     statements: 80,
    //   },
    // },
};

export default createJestConfig(customJestConfig);
