import { createApp } from "vue";
import App from "./App.vue";
import "./main.css";

const root = document.querySelector("#app");

function showStartupError(error) {
  console.error("FlareDrive startup failed", error);
  const message = error instanceof Error ? error.message : String(error);
  root.innerHTML = `
    <main class="boot-screen boot-error">
      <div class="boot-mark" aria-hidden="true">!</div>
      <h1>页面启动失败</h1>
      <p>请检查网络连接后重试。如果问题持续，请稍后再试。</p>
      <details><summary>错误详情</summary><pre></pre></details>
      <button type="button">重新加载页面</button>
    </main>
  `;
  root.querySelector("pre").textContent = message;
  root.querySelector("button").addEventListener("click", () => window.location.reload());
}

async function mountApp() {
  root.innerHTML = `
    <main class="boot-screen">
      <div class="boot-mark" aria-hidden="true">F</div>
      <p>正在启动 FlareDrive…</p>
    </main>
  `;

  try {
    const app = createApp(App);
    app.config.errorHandler = showStartupError;
    app.mount(root);
  } catch (error) {
    showStartupError(error);
  }
}

window.addEventListener("error", (event) => {
  if (event.error) showStartupError(event.error);
});
window.addEventListener("unhandledrejection", (event) => {
  showStartupError(event.reason);
});

mountApp();
