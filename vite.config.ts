import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: update `base` to '/<NOME_DO_REPO>/' quando publicar em GitHub Pages (repositório de projeto).
export default defineConfig({
  plugins: [react()],
  base: '/Eng_Mobilization_Calc/',
})