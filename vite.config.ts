import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Define __dirname for ESM compatibility as it is not globally available in ES modules.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// গিটহাবে আপনার রিপোজিটরির নাম যদি হয় 'amar-khata', তাহলে base হবে '/amar-khata/'
// যদি আপনার প্রোফাইল পেজ (username.github.io) হয়, তাহলে base হবে '/'
export default defineConfig({
  base: './', 
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  build: {
    outDir: 'dist',
  }
});