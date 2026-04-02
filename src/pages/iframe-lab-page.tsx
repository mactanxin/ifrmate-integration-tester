import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Copy,
  Globe,
  KeyRound,
  MonitorSmartphone,
  RefreshCw,
  Send,
  ShieldCheck,
  TestTube2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const defaultUrl = "http://localhost:3001";
const defaultBackendBase = "https://192.168.21.220:443/";
const defaultLoginPath = "/dev/aiums/auth/login/";
const defaultSandbox =
  "allow-scripts allow-same-origin allow-forms allow-popups";
const defaultAllow = "clipboard-write; fullscreen";
const defaultMessage = `{
  "type": "PING",
  "source": "iframe-integration-lab",
  "timestamp": "2026-04-02T00:00:00.000Z"
}`;

const viewportPresets = [
  { label: "Desktop", value: "100%" },
  { label: "Tablet", value: "820px" },
  { label: "Mobile", value: "390px" },
];

const sampleTargets = [
  "http://localhost:3001",
  "http://localhost:3000",
  "http://localhost:5173",
];

const checklistItems = [
  "目标站点是否发送了 X-Frame-Options 或 frame-ancestors 限制。",
  "认证页在 iframe 内是否触发第三方 Cookie 或 SSO 限制。",
  "postMessage 是否校验 origin，并且双方事件结构一致。",
  "iframe 高度、滚动策略和移动端宽度是否符合宿主容器要求。",
];

type LogItem = {
  id: string;
  type: "system" | "message";
  title: string;
  detail: string;
  timestamp: string;
};

type LoginPayload = {
  code?: number;
  msg?: string;
  data?: {
    token?: string;
    userInfo?: Record<string, unknown>;
    userId?: string;
    roleType?: string;
    permList?: string;
    userMode?: string;
  };
};

type LoginResponse = {
  code?: number;
  msg?: string;
  data?: {
    token?: string;
    userInfo?: Record<string, unknown>;
    userId?: string;
    roleType?: string;
    permList?: string;
    userMode?: string;
  };
};

function makeLog(
  type: LogItem["type"],
  title: string,
  detail: string,
): LogItem {
  return {
    id: crypto.randomUUID(),
    type,
    title,
    detail,
    timestamp: new Date().toLocaleTimeString(),
  };
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("about:")
  ) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function getOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return "*";
  }
}

function asPrettyJson(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function resolveLoginPayload(response: LoginResponse): LoginPayload {
  const nested = response.data as LoginPayload | undefined;

  if (
    nested &&
    (typeof nested.code !== "undefined" ||
      typeof nested.msg !== "undefined" ||
      (nested.data &&
        typeof nested.data === "object" &&
        "token" in nested.data))
  ) {
    return nested;
  }

  return {
    code: response.code,
    msg: response.msg,
    data: response.data,
  };
}

async function sha256Enc(value: string) {
  const content = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", content);

  return Array.from(new Uint8Array(digest))
    .map((item) => item.toString(16).padStart(2, "0"))
    .join("");
}

export function IframeLabPage() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const [url, setUrl] = useState(defaultUrl);
  const [backendBase] = useState(defaultBackendBase);
  const [loginPath] = useState(defaultLoginPath);
  const [username, setUsername] = useState("admin@ailink.com");
  const [password, setPassword] = useState("Ailink123456");
  const [title, setTitle] = useState("Embedded integration target");
  const [sandbox, setSandbox] = useState(defaultSandbox);
  const [allow, setAllow] = useState(defaultAllow);
  const [height, setHeight] = useState("720");
  const [viewportWidth, setViewportWidth] = useState("100%");
  const [messageDraft, setMessageDraft] = useState(defaultMessage);
  const [realToken, setRealToken] = useState("");
  const [rawToken, setRawToken] = useState("");
  const [loginStatus, setLoginStatus] = useState("未获取");
  const [lastRequestAt, setLastRequestAt] = useState("");
  const [lastSuccessAt, setLastSuccessAt] = useState("");
  const [isFetchingToken, setIsFetchingToken] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [logs, setLogs] = useState<LogItem[]>([
    makeLog(
      "system",
      "Workbench ready",
      "输入 URL 后即可预览 iframe，并支持通过真实登录接口获取 token。",
    ),
  ]);

  const previewUrl = normalizeUrl(url);
  const targetOrigin = previewUrl ? getOrigin(previewUrl) : "*";
  const embedCode = `<iframe
  title="${title}"
  src="${previewUrl || defaultUrl}"
  sandbox="${sandbox}"
  allow="${allow}"
  loading="eager"
  referrerpolicy="strict-origin-when-cross-origin"
  style="width: ${viewportWidth}; height: ${height}px; border: 0; border-radius: 24px;"
></iframe>`;

  function pushLog(item: LogItem) {
    setLogs((current) => [item, ...current].slice(0, 12));
  }

  async function copyEmbedCode() {
    await navigator.clipboard.writeText(embedCode);
    pushLog(makeLog("system", "Embed copied", "iframe 代码已复制到剪贴板。"));
  }

  function handleReload() {
    setReloadKey((value) => value + 1);
    pushLog(
      makeLog(
        "system",
        "Iframe reloaded",
        `重新加载目标地址: ${previewUrl || defaultUrl}`,
      ),
    );
  }

  function handleOpen() {
    const nextUrl = previewUrl || defaultUrl;
    window.open(nextUrl, "_blank", "noopener,noreferrer");
    pushLog(makeLog("system", "Opened in new tab", nextUrl));
  }

  function handleSendMessage() {
    const target = iframeRef.current?.contentWindow;

    if (!target) {
      pushLog(
        makeLog(
          "system",
          "Message blocked",
          "iframe 尚未加载完成，暂时无法发送消息。",
        ),
      );
      return;
    }

    try {
      const payload = JSON.parse(messageDraft);
      target.postMessage(payload, targetOrigin === "null" ? "*" : targetOrigin);
      pushLog(
        makeLog(
          "message",
          "postMessage dispatched",
          `发送到 ${targetOrigin}\n${JSON.stringify(payload, null, 2)}`,
        ),
      );
    } catch (error) {
      pushLog(
        makeLog(
          "system",
          "Invalid JSON payload",
          error instanceof Error ? error.message : "消息体不是合法 JSON。",
        ),
      );
    }
  }

  async function handleFetchRealToken() {
    setIsFetchingToken(true);
    setLoginStatus("获取中...");
    setLastRequestAt(new Date().toLocaleString());

    try {
      const params = {
        userName: username,
        password: await sha256Enc(password),
      };

      const response = await fetch(loginPath, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(
          `登录请求失败: ${response.status} ${response.statusText}`,
        );
      }

      const res = (await response.json()) as LoginResponse;
      console.log("awaited real res: ", res);

      const nextRawToken = res.data.token;
      const aiumsToken =
        "Basic" + btoa(encodeURI(`${nextRawToken}:${Date.now()}`));

      localStorage.setItem("aiumsToken", aiumsToken);
      setRawToken(nextRawToken);
      setRealToken(aiumsToken);
      setLoginStatus("已获取");
      setLastSuccessAt(new Date().toLocaleString());

      const nextMessage = {
        type: "TOKEN",
        payload: {
          token: aiumsToken,
          expireAt: Date.now() + 3600000,
          userInfo: loginResult.userInfo || {
            userId: loginResult.userId || username,
            roleType: loginResult.roleType || "",
            permList: loginResult.permList || "[]",
            userMode: loginResult.userMode || "",
            username,
          },
        },
      };

      setMessageDraft(JSON.stringify(nextMessage, null, 2));
      pushLog(
        makeLog(
          "system",
          "Real token fetched",
          `后端: ${backendBase}\n接口: ${loginPath}\n用户: ${username}\naiumsToken 已写入 localStorage`,
        ),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "获取 token 失败";
      setLoginStatus("获取失败");
      pushLog(makeLog("system", "Token fetch failed", message));
    } finally {
      setIsFetchingToken(false);
    }
  }

  function handleSendTokenToIframe() {
    if (!realToken) {
      pushLog(
        makeLog(
          "system",
          "Token unavailable",
          "请先通过真实登录接口获取 token。",
        ),
      );
      return;
    }

    const payload = {
      type: "TOKEN",
      payload: {
        token: realToken,
        expireAt: Date.now() + 3600000,
      },
    };

    setMessageDraft(JSON.stringify(payload, null, 2));
    const target = iframeRef.current?.contentWindow;

    if (!target) {
      pushLog(
        makeLog(
          "system",
          "Iframe unavailable",
          "iframe 尚未加载完成，暂时无法发送 TOKEN。",
        ),
      );
      return;
    }

    target.postMessage(payload, targetOrigin === "null" ? "*" : targetOrigin);
    pushLog(
      makeLog(
        "message",
        "TOKEN dispatched",
        `发送到 ${targetOrigin}\n${JSON.stringify(payload, null, 2)}`,
      ),
    );
  }

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      pushLog(
        makeLog(
          "message",
          `Message received from ${event.origin || "unknown origin"}`,
          asPrettyJson(event.data),
        ),
      );
    }

    window.addEventListener("message", onMessage);

    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, []);

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <Card className="border-border/70 bg-background/90 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle>Control Panel</CardTitle>
          <CardDescription>
            配置嵌入地址、权限策略、视口尺寸和消息负载。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Globe className="size-4 text-muted-foreground" />
              Target URL
            </div>
            <Input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://app.example.com/embed"
            />
            <div className="flex flex-wrap gap-2">
              {sampleTargets.map((item) => (
                <Button
                  key={item}
                  size="sm"
                  variant="outline"
                  onClick={() => setUrl(item)}
                >
                  {item.replace(/^https?:\/\//, "")}
                </Button>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-border/80 bg-muted/35 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <KeyRound className="size-4 text-muted-foreground" />
              Real Token
            </div>
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium text-foreground">Username</span>
                  <Input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium text-foreground">Password</span>
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium text-foreground">Backend</span>
                  <Input value={backendBase} readOnly />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium text-foreground">
                    Login path
                  </span>
                  <Input value={loginPath} readOnly />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant={realToken ? "default" : "outline"}>
                  {loginStatus}
                </Badge>
                <span>获取成功后会写入 `localStorage.aiumsToken`。</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/80 bg-background p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Last request
                  </div>
                  <div className="mt-2 text-sm font-medium text-foreground">
                    {lastRequestAt || "尚未请求"}
                  </div>
                </div>
                <div className="rounded-2xl border border-border/80 bg-background p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Last success
                  </div>
                  <div className="mt-2 text-sm font-medium text-foreground">
                    {lastSuccessAt || "尚未成功获取"}
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-2xl border border-border/80 bg-background p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Latest aiumsToken
                  </div>
                  <pre className="mt-2 overflow-x-auto text-xs leading-6 whitespace-pre-wrap text-foreground">
                    {realToken || "尚未获取真实 token"}
                  </pre>
                </div>

                <div className="rounded-2xl border border-border/80 bg-background p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Latest raw token
                  </div>
                  <pre className="mt-2 overflow-x-auto text-xs leading-6 whitespace-pre-wrap text-foreground">
                    {rawToken || "尚未获取原始 token"}
                  </pre>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-foreground">Iframe title</span>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-foreground">Height</span>
              <Input
                type="number"
                min="240"
                step="40"
                value={height}
                onChange={(event) => setHeight(event.target.value)}
              />
            </label>
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MonitorSmartphone className="size-4 text-muted-foreground" />
              Viewport width
            </div>
            <div className="flex flex-wrap gap-2">
              {viewportPresets.map((preset) => (
                <Button
                  key={preset.value}
                  size="sm"
                  variant={
                    viewportWidth === preset.value ? "default" : "outline"
                  }
                  onClick={() => setViewportWidth(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <Input
              value={viewportWidth}
              onChange={(event) => setViewportWidth(event.target.value)}
              placeholder="例如 1280px 或 100%"
            />
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="size-4 text-muted-foreground" />
              Sandbox tokens
            </div>
            <Textarea
              value={sandbox}
              onChange={(event) => setSandbox(event.target.value)}
              className="min-h-24"
            />
          </section>

          <section className="flex flex-col gap-2">
            <div className="text-sm font-medium">Allow policy</div>
            <Textarea
              value={allow}
              onChange={(event) => setAllow(event.target.value)}
              className="min-h-20"
            />
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Send className="size-4 text-muted-foreground" />
              postMessage payload
            </div>
            <Textarea
              value={messageDraft}
              onChange={(event) => setMessageDraft(event.target.value)}
              className="min-h-40 font-mono text-xs"
            />
          </section>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button onClick={handleFetchRealToken} disabled={isFetchingToken}>
            <KeyRound data-icon="inline-start" />
            {isFetchingToken ? "Fetching token..." : "Fetch real token"}
          </Button>
          <Button variant="outline" onClick={handleSendTokenToIframe}>
            <Send data-icon="inline-start" />
            Send TOKEN
          </Button>
          <Button onClick={handleReload}>
            <RefreshCw data-icon="inline-start" />
            Reload iframe
          </Button>
          <Button variant="outline" onClick={handleSendMessage}>
            <Send data-icon="inline-start" />
            Send custom message
          </Button>
          <Button variant="outline" onClick={copyEmbedCode}>
            <Copy data-icon="inline-start" />
            Copy embed
          </Button>
        </CardFooter>
      </Card>

      <div className="flex flex-col gap-6">
        <Card className="border-border/70 bg-background/90 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle>Latest Real Token</CardTitle>
            <CardDescription>
              获取成功后，这里会显示当前最新的
              `aiumsToken`，便于直接核对和复制。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <Badge variant={realToken ? "default" : "outline"}>
                {loginStatus}
              </Badge>
              <span>请求时间: {lastRequestAt || "尚未请求"}</span>
              <span>成功时间: {lastSuccessAt || "尚未成功获取"}</span>
            </div>
            <pre className="overflow-x-auto rounded-2xl border border-border bg-muted/60 p-4 text-xs leading-6 whitespace-pre-wrap text-foreground">
              {realToken || "尚未获取真实 token"}
            </pre>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/90 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Preview Surface
              <Badge variant="outline">{targetOrigin}</Badge>
            </CardTitle>
            <CardDescription>
              当前配置直接作用于 iframe，适合快速验证集成环境。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">sandbox</Badge>
              <span className="rounded-full bg-muted px-2 py-1">{sandbox}</span>
              {rawToken ? <Badge variant="outline">token ready</Badge> : null}
            </div>

            <div className="overflow-hidden rounded-[28px] border border-border bg-[linear-gradient(135deg,rgba(15,23,42,0.03),rgba(59,130,246,0.10))] p-3">
              <div
                className="mx-auto overflow-hidden rounded-[24px] border border-border bg-background shadow-2xl"
                style={{ width: viewportWidth }}
              >
                <div className="flex items-center justify-between border-b border-border bg-muted/60 px-4 py-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-red-400" />
                    <span className="size-2 rounded-full bg-amber-400" />
                    <span className="size-2 rounded-full bg-emerald-400" />
                  </div>
                  <span className="truncate">
                    {previewUrl || "请输入合法目标地址"}
                  </span>
                </div>

                <iframe
                  key={reloadKey}
                  ref={iframeRef}
                  title={title}
                  src={previewUrl || defaultUrl}
                  sandbox={sandbox}
                  allow={allow}
                  className="block w-full bg-background"
                  style={{ height: `${height}px` }}
                  onLoad={() =>
                    pushLog(
                      makeLog(
                        "system",
                        "Iframe loaded",
                        `加载完成: ${previewUrl || defaultUrl}`,
                      ),
                    )
                  }
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TestTube2 className="size-4" />
              用相同参数生成可粘贴的嵌入代码和联调消息。
            </div>
            <Button variant="outline" onClick={handleOpen}>
              <ArrowUpRight data-icon="inline-start" />
              Open target
            </Button>
          </CardFooter>
        </Card>

        <Tabs defaultValue="embed">
          <TabsList>
            <TabsTrigger value="embed">Embed code</TabsTrigger>
            <TabsTrigger value="events">Event log</TabsTrigger>
            <TabsTrigger value="checks">Checks</TabsTrigger>
          </TabsList>

          <TabsContent value="embed">
            <Card className="border-border/70 bg-background/90 shadow-sm backdrop-blur">
              <CardHeader>
                <CardTitle>Generated Snippet</CardTitle>
                <CardDescription>
                  这段 iframe
                  代码使用当前工作台配置，可直接贴到宿主应用中继续验证。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="overflow-x-auto rounded-2xl border border-border bg-muted/60 p-4 text-xs leading-6 whitespace-pre-wrap text-foreground">
                  {embedCode}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events">
            <Card className="border-border/70 bg-background/90 shadow-sm backdrop-blur">
              <CardHeader>
                <CardTitle>Event Stream</CardTitle>
                <CardDescription>
                  自动记录 iframe 加载和窗口 `message`
                  事件，方便确认联调是否成功。
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-2xl border border-border/80 bg-muted/40 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            log.type === "message" ? "default" : "outline"
                          }
                        >
                          {log.type}
                        </Badge>
                        <div className="font-medium">{log.title}</div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {log.timestamp}
                      </span>
                    </div>
                    <Separator className="my-3" />
                    <pre className="overflow-x-auto text-xs leading-6 whitespace-pre-wrap text-muted-foreground">
                      {log.detail}
                    </pre>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checks">
            <Card className="border-border/70 bg-background/90 shadow-sm backdrop-blur">
              <CardHeader>
                <CardTitle>Integration Checklist</CardTitle>
                <CardDescription>
                  跑 iframe 联调时，优先确认这四类问题，能更快定位失败原因。
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {checklistItems.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-border/80 bg-muted/40 p-4 text-sm leading-6"
                  >
                    {item}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
