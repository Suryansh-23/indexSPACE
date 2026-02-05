import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@functionspace/core': path.resolve(__dirname, '../packages/core/src'),
      '@functionspace/react': path.resolve(__dirname, '../packages/react/src'),
      '@functionspace/ui': path.resolve(__dirname, '../packages/ui/src'),
    },
  },
});
