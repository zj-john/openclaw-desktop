import { useState, useCallback } from "react";
import Bootstrap from "./features/bootstrap/Bootstrap";
import Onboarding from "./features/onboarding/Onboarding";
// import UpdaterWidget from "./features/updater/UpdaterWidget"; // 暂时隐藏，发版后再启用
import { openclawBridge } from "./bridge/openclawBridge";

export default function App() {
  const [bootstrapped, setBootstrapped] = useState(false);
  const [webUrl, setWebUrl] = useState("");
  const [onboardingDone, setOnboardingDone] = useState(false); // 跟踪 onboarding 状态，避免误显示配置页

  /** Bootstrap 完成回调 */
  const handleBootstrapReady = useCallback((done: boolean) => {
    setBootstrapped(true);
    setOnboardingDone(done);
    if (done) {
      // 用户之前已完成 Onboarding，直接加载 OpenClaw UI
      void loadOpenClawUrl();
    }
    // done=false → 显示 Onboarding 配置页面
  }, []);

  /** Onboarding 保存完成 → 切换到 OpenClaw UI */
  const handleOnboardingSuccess = useCallback(async () => {
    void loadOpenClawUrl();
  }, []);

  /** 获取 OpenClaw Web URL 并切换到 WebView */
  const loadOpenClawUrl = useCallback(async () => {
    try {
      const result = await openclawBridge.getOpenClawWebUrl();
      if (result.url) {
        setWebUrl(result.url);
        // 直接在当前窗口导航到 OpenClaw Web UI（绕过 iframe CSP 限制）
        window.location.href = result.url;
      }
    } catch {
      // Gateway 未就绪时停留在当前页面（不会再误显示 Onboarding 配置页）
    }
  }, []);

  // onboarding 已完成、正在加载 URL 时显示「正在跳转」而非 LLM 配置页
  const showLoadingJump = bootstrapped && onboardingDone && !webUrl;

  return (
    <main className="app-root">
      <header className="hero">
        <div>
          <h1>OpenClaw 桌面版</h1>
        </div>
        {/* <div className="hero-tools">
          <UpdaterWidget />
        </div> */}
      </header>

      {!bootstrapped ? (
        <Bootstrap onReady={handleBootstrapReady} />
      ) : showLoadingJump ? (
        /* onboarding 已完成，正在获取 URL 并跳转到 OpenClaw Web UI */
        <section className="panel" style={{ textAlign: "center", padding: "60px 20px" }}>
          <p style={{ color: "#64748B", fontSize: 16 }}>正在跳转到 OpenClaw...</p>
          <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 8 }}>
            Gateway 正在启动中，请稍候...
          </p>
        </section>
      ) : webUrl ? (
        /* 已获取 URL，正在通过 window.location.href 导航（正常情况下 window.location.href 已跳走） */
        <section className="panel" style={{ textAlign: "center", padding: "60px 20px" }}>
          <p style={{ color: "#64748B", fontSize: 16 }}>正在跳转到 OpenClaw...</p>
          <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 8 }}>
            如果没有自动跳转，请 <a href={webUrl} style={{ color: "#2563EB" }}>点击这里</a>
          </p>
        </section>
      ) : (
        /* 仅当 onboarding 未完成时才显示 LLM 配置页面 */
        <Onboarding
          onLoginSuccess={handleOnboardingSuccess}
        />
      )}
    </main>
  );
}
