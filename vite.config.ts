import { defineConfig } from 'vitest/config';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';

const certPath = path.resolve(import.meta.dirname, '../../docker/certificates');
const useLocalCerts = process.env.USE_LOCAL_CERTS === 'true';

const httpsOptions =
    useLocalCerts && fs.existsSync(`${certPath}/aquadactyl.test.pem`)
        ? {
              key: fs.readFileSync(`${certPath}/aquadactyl.test-key.pem`),
              cert: fs.readFileSync(`${certPath}/aquadactyl.test.pem`),
              ca: fs.readFileSync(`${certPath}/root_ca.pem`),
          }
        : undefined;

export default defineConfig({
    base: '/',
    plugins: [
        // Vitest uses Vite's server API without serving the panel through Laravel.
        process.env.VITEST !== 'true' &&
            laravel({
                input: ['resources/scripts/index.tsx'],
                refresh: true,
            }),
        react(),
        tailwindcss(),
    ],
    optimizeDeps: {
        exclude: ['lucide-react'],
    },
    server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        cors: true,
        https: httpsOptions,
        hmr: {
            host: 'aquadactyl.test',
        },
    },
    build: {
        chunkSizeWarningLimit: 1200,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        if (id.includes('@codemirror')) {
                            return 'codemirror';
                        }
                        if (id.includes('@xterm')) {
                            return 'xterm';
                        }
                        if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
                            return 'charts';
                        }
                    }
                },
            },
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, 'resources/scripts'),
            '@definitions': path.resolve(import.meta.dirname, 'resources/scripts/api/definitions'),
            '@feature': path.resolve(import.meta.dirname, 'resources/scripts/components/server/features'),
            '@blueprint': path.resolve(import.meta.dirname, 'resources/scripts/blueprint'),
        },
    },
    define: {
        'process.env.DEBUG': JSON.stringify(process.env.NODE_ENV !== 'production'),
        'process.env.WEBPACK_BUILD_HASH': JSON.stringify(Date.now().toString(16)),
    },
    test: {
        globals: true,
        environment: 'happy-dom',
        setupFiles: ['resources/scripts/setup-tests.ts'],
        include: ['resources/scripts/**/*.{test,spec}.{ts,tsx}'],
        exclude: ['**/node_modules/**', '**/.blueprint/dist/**'],
        server: {
            deps: {
                inline: ['boring-avatars'],
            },
        },
    },
});
