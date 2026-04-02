import { ArrowRight, BadgeCheck, ScanSearch, ShieldEllipsis } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

const playbookSections = [
  {
    icon: ShieldEllipsis,
    title: "Host policy",
    description:
      "先确认目标站点是否允许被嵌入。若返回 X-Frame-Options 或 CSP frame-ancestors 拒绝，前端容器本身不会有修复空间。",
  },
  {
    icon: ScanSearch,
    title: "Handshake",
    description:
      "在宿主和 iframe 双方约定好消息格式、origin 校验规则和初始化握手时机，避免单边发送却无人接收。",
  },
  {
    icon: BadgeCheck,
    title: "UX parity",
    description:
      "最后再对滚动、键盘焦点、全屏、弹窗和移动端尺寸做回归，防止只在独立页面可用、嵌入后退化。",
  },
]

export function PlaybookPage() {
  return (
    <Card className="border-border/70 bg-background/90 shadow-sm backdrop-blur">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Reference</Badge>
          <Badge variant="outline">iframe QA</Badge>
        </div>
        <CardTitle>Integration Playbook</CardTitle>
        <CardDescription>
          这是配合工作台一起使用的排查顺序，用来压缩 iframe 集成测试的来回试错成本。
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-3">
        {playbookSections.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="rounded-[24px] border border-border/80 bg-muted/35 p-5"
          >
            <div className="mb-4 flex size-10 items-center justify-center rounded-2xl bg-background shadow-sm">
              <Icon className="size-5" />
            </div>
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
        ))}

        <div className="rounded-[24px] border border-dashed border-border/80 bg-background p-5 lg:col-span-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            推荐顺序
            <ArrowRight className="size-4 text-muted-foreground" />
          </div>
          <Separator className="my-4" />
          <p className="text-sm leading-7 text-muted-foreground">
            先看策略限制，再测 iframe 能否成功加载，然后确认 postMessage 是否双向可达，最后才做 UI 与设备回归。这个顺序通常比盲改 sandbox 更高效。
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
