import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function react19ReconcilerCompat(): Plugin {
  return {
    name: 'react-19-reconciler-compat',
    enforce: 'pre',
    transform(code, id) {
      if (id.includes('react-reconciler')) {
        return code.replaceAll(
          'var ReactSharedInternals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;',
          'var ReactSharedInternals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED || React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE || { ReactCurrentOwner: { current: null }, ReactCurrentBatchConfig: { transition: null }, ReactCurrentActQueue: { current: null, isBatchingLegacy: false, didScheduleLegacyUpdate: false } }; if (!ReactSharedInternals.ReactCurrentOwner) ReactSharedInternals.ReactCurrentOwner = { current: null }; if (!ReactSharedInternals.ReactCurrentBatchConfig) ReactSharedInternals.ReactCurrentBatchConfig = { transition: null }; if (!ReactSharedInternals.ReactCurrentActQueue) ReactSharedInternals.ReactCurrentActQueue = { current: null, isBatchingLegacy: false, didScheduleLegacyUpdate: false };'
        );
      }
      return null;
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react19ReconcilerCompat(), react(), tailwindcss()],
  optimizeDeps: {
    esbuildOptions: {
      plugins: [
        {
          name: 'react-19-reconciler-compat-esbuild',
          setup(build) {
            build.onLoad({ filter: /react-reconciler/ }, async (args) => {
              const fs = await import('fs');
              let contents = await fs.promises.readFile(args.path, 'utf8');
              contents = contents.replaceAll(
                'var ReactSharedInternals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;',
                'var ReactSharedInternals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED || React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE || { ReactCurrentOwner: { current: null }, ReactCurrentBatchConfig: { transition: null }, ReactCurrentActQueue: { current: null, isBatchingLegacy: false, didScheduleLegacyUpdate: false } }; if (!ReactSharedInternals.ReactCurrentOwner) ReactSharedInternals.ReactCurrentOwner = { current: null }; if (!ReactSharedInternals.ReactCurrentBatchConfig) ReactSharedInternals.ReactCurrentBatchConfig = { transition: null }; if (!ReactSharedInternals.ReactCurrentActQueue) ReactSharedInternals.ReactCurrentActQueue = { current: null, isBatchingLegacy: false, didScheduleLegacyUpdate: false };'
              );
              return { contents, loader: 'js' };
            });
          },
        },
      ],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('three') || id.includes('@react-three')) {
            return 'three-scene';
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**/*', 'node_modules/**/*'],
    css: false,
  },
} as any);
