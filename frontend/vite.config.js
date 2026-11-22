import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// CSS Modules(*.module.css)は、Vite が標準で対応しているため、追加の設定は不要。
export default defineConfig({
  plugins: [react()],
})
