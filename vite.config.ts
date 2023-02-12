import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import progress from 'vite-plugin-progress'
import svgr from 'vite-plugin-svgr'
import tsConfigPaths from 'vite-tsconfig-paths'


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tsConfigPaths(),
    progress({
      format: "Building [:bar] :percent | :current of :total",
    }),
    svgr(),
    react(),
  ],
})
