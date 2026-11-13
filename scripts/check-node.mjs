/**
 * Node 版本守卫：Vite 8 / rolldown 依赖 node:util 的 styleText（Node 20.12+），
 * 版本不足时直接给出可执行的修复指引，避免抛 SyntaxError。
 */
const REQUIRED = '^20.19.0 || >=22.12.0'
const raw = process.versions.node
const [major, minor] = raw.split('.').map((n) => Number(n))

const ok = (major === 20 && minor >= 19) || (major === 22 && minor >= 12) || major > 22

if (ok) {
  process.exit(0)
}

const line = '='.repeat(64)
console.error(`
${line}
✖ Node 版本过低：当前 v${raw}，本项目要求 ${REQUIRED}

  原因：Vite 8 / rolldown 使用了 node:util 的 styleText（Node 20.12 起提供），
        低版本会报 "does not provide an export named 'styleText'"。

  修复（nvm-windows，需管理员权限的 PowerShell）：
      nvm install 22   # 已装过可跳过
      nvm use 22       # 需要管理员权限创建软链
      node -v          # 确认已是 v22.x

  临时绕过（当前窗口生效，无需管理员）：
      $env:Path = "D:\\nvm\\v22.23.4;" + $env:Path
      node -v
${line}
`)
process.exit(1)
