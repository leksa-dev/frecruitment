import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const GRADER_ORIGIN = 'https://frecruitment-grader.frecruitment-grader.workers.dev'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/frecruitment/',
  server: {
    // Local dev: the Worker only accepts the GitHub Pages origin, so the dev
    // server forwards grading requests to it as that origin (see .env.development).
    proxy: {
      '/__grader': {
        target: GRADER_ORIGIN,
        changeOrigin: true,
        rewrite: () => '/grade',
        headers: { Origin: 'https://leksa-dev.github.io' },
      },
    },
  },
})
