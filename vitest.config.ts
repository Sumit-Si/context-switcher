import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./tests/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'tests/',
                '**/*.test.ts',
                '**/*.spec.ts',
                'dist/',
                'migrations/',
                'script/',
                '**/*.d.ts',
                'vitest.config.ts'
            ],
            thresholds: {
                lines: 70,
                functions: 70,
                branches: 70,
                statements: 70
            }
        },
        testTimeout: 30000, // 30 seconds for integration tests with database
        hookTimeout: 30000
    }
});
