import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  /**
   * 登录认证服务（验证码 / 登录），可通过 .env.local 的 VITE_API_AUTH_TARGET 覆盖
   * 登录成功后业务接口走设备主服务，仅端口号不同
   */
  const authTarget = env.VITE_API_AUTH_TARGET || 'http://117.140.203.9:8901'
  /** API 文档中的设备主服务地址，可通过 .env.local 的 VITE_API_TARGET 覆盖 */
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
        // 登录认证接口走独立端口 8901（须放在 '/api' 之前，先匹配更具体的前缀）
        '/api/captcha': {
          target: authTarget,
          changeOrigin: true,
        },
        '/api/login': {
          target: authTarget,
          changeOrigin: true,
        },
        // 其余业务接口走设备主服务 8970，开发期通过代理转发避免浏览器跨域
        '/api': {
          target,
          changeOrigin: true,
        },
      },
    },
  }
})
