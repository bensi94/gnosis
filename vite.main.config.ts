import { defineConfig, loadEnv } from 'vite';
import path from 'path';
import { builtinModules } from 'module';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: {
      __GH_CLIENT_SECRET__: JSON.stringify(env.GH_CLIENT_SECRET ?? ''),
    },
    build: {
      rollupOptions: {
        external: [
          'electron',
          ...builtinModules,
          ...builtinModules.map((m) => `node:${m}`),
        ],
      },
    },
  };
});
