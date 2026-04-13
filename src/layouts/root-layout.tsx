import { NavLink, Outlet } from "react-router-dom"
import { Blocks, BookOpenCheck, Cable } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const navigationItems = [
  { to: "/", label: "Workbench", icon: Blocks, end: true },
  { to: "/playbook", label: "Playbook", icon: BookOpenCheck },
]

export function RootLayout() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(73,113,255,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.18),_transparent_30%),linear-gradient(180deg,_var(--background),color-mix(in_oklab,var(--background)_82%,white_18%))]">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-border/70 bg-background/85 px-5 py-4 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <Cable className="size-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold tracking-tight">
                    Iframe Integration Lab
                  </h1>
                  <Badge variant="secondary">Ver 1.0</Badge>
                </div>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  用一个页面完成嵌入 URL 验证、sandbox 调试、postMessage 联调和
                  iframe 代码生成。
                </p>
              </div>
            </div>

            <nav className="flex flex-wrap gap-2">
              {navigationItems.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  end={end}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                      isActive
                        ? "border-primary/20 bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    )
                  }
                >
                  <Icon className="size-4" />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        </header>

        <main className="flex-1 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
