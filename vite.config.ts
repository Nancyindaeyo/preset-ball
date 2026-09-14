import vue from '@vitejs/plugin-vue';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')) as {
  version?: string;
};

export default defineConfig(({ mode }) => ({
  define: {
    __PB_VERSION__: JSON.stringify(String(packageJson.version ?? '0.1.0')),
  },
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      input: 'src/index.ts',
      output: {
        format: 'es',
        entryFileNames: '[name].js',
        chunkFileNames: '[name].[hash].chunk.js',
        assetFileNames: '[name].[ext]',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: mode === 'production' ? false : 'inline',
    minify: mode === 'production',
    target: 'esnext',
  },
}));
