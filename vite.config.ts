import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  /** API 文档中的设备服务地址，可通过 .env.local 的 VITE_API_TARGET 覆盖 */
  const target = env.VITE_API_TARGET || 'http://117.140.203.9:8970'

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      host: '127.0.0.1',
      proxy: {
        // 开发期通过代理转发设备 API，避免浏览器跨域
        '/api': {
          target,
          changeOrigin: true,
        },
      },
    },
  }
})
