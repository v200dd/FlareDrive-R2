<template>
  <div class="drive-app">
    <div v-if="sessionLoading" class="session-screen" role="status" aria-live="polite">
      <div class="brand-mark brand-mark-large">
        <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M8 23h16a5 5 0 0 0 .2-10A8.5 8.5 0 0 0 8 11a6 6 0 0 0 0 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="m12 17 4-4 4 4m-4-4v10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <span class="spinner"></span>
      <p>正在打开你的网盘…</p>
    </div>

    <div v-else-if="!isAuthenticated || requireLogin" class="login-screen">
      <form class="login-card" @submit.prevent="submitPassword">
        <div class="brand-mark brand-mark-large">
          <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M8 23h16a5 5 0 0 0 .2-10A8.5 8.5 0 0 0 8 11a6 6 0 0 0 0 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="m12 17 4-4 4 4m-4-4v10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <p class="login-eyebrow">FlareDrive</p>
        <h1>欢迎回来</h1>
        <p class="login-description">登录网盘，继续管理你的文件。</p>
        <label for="username">账号</label>
        <input id="username" v-model.trim="usernameInput" type="text" autocomplete="username" placeholder="输入账号" required :disabled="loginPending" />
        <label for="password">密码</label>
        <input id="password" v-model="passwordInput" type="password" autocomplete="current-password" placeholder="输入密码" required :disabled="loginPending" />
        <p v-if="loginError" class="form-error" role="alert">{{ loginError }}</p>
        <p v-if="loadError" class="form-error" role="alert">{{ loadError }}</p>
        <button type="submit" class="primary-button login-submit" :disabled="loginPending">
          <span v-if="loginPending" class="spinner"></span>
          {{ loginPending ? '正在登录…' : '进入网盘' }}
          <svg v-if="!loginPending" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </form>
    </div>

    <div v-else class="main" @dragenter.prevent @dragover.prevent @drop.prevent="onDrop">
      <aside class="sidebar">
        <button class="brand" @click="cwd = ''; search = ''" aria-label="FlareDrive，返回全部文件">
          <span class="brand-mark">
            <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M8 23h16a5 5 0 0 0 .2-10A8.5 8.5 0 0 0 8 11a6 6 0 0 0 0 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="m12 17 4-4 4 4m-4-4v10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
          <span>FlareDrive<span class="brand-caption">让文件，井井有条</span></span>
        </button>
        <div class="sidebar-section-label">文件空间</div>
        <button class="sidebar-nav active" @click="cwd = ''; search = ''">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3V7Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>
          全部文件
          <svg class="nav-chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m10 7 5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="sidebar-account">
          <span class="account-avatar">{{ authenticatedUser ? authenticatedUser.slice(0, 1).toUpperCase() : '访' }}</span>
          <div><strong>{{ authenticatedUser || '访客' }}</strong><span>{{ authenticatedUser ? '已登录' : '访客访问' }}</span></div>
          <button class="icon-button" @click="logout" :aria-label="authenticatedUser ? '退出登录' : '登录账号'" :title="authenticatedUser ? '退出登录' : '登录账号'">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 5H5v14h4m5-12 5 5-5 5M9 12h10" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </aside>

      <div class="workspace">
        <header class="app-bar">
          <div class="mobile-brand"><span class="brand-mark"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M8 23h16a5 5 0 0 0 .2-10A8.5 8.5 0 0 0 8 11a6 6 0 0 0 0 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="m12 17 4-4 4 4m-4-4v10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><strong>FlareDrive</strong></div>
          <span class="header-label">我的网盘</span>
          <label class="search-field">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" stroke-width="1.7"/><path d="m16 16 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
            <input type="search" v-model="search" aria-label="搜索当前目录的文件" placeholder="搜索当前目录的文件…" />
          </label>
          <button class="mobile-account icon-button" @click="logout" :aria-label="authenticatedUser ? '退出登录' : '登录账号'" :title="authenticatedUser ? '退出登录' : '登录账号'"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="1.7"/><path d="M5 20v-2a7 7 0 0 1 14 0v2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></button>
        </header>

        <main class="content">
          <div class="page-heading">
            <div>
              <p class="page-eyebrow">你的文件空间</p>
              <h1>{{ cwd ? cwd.split('/').filter(Boolean).pop() : '全部文件' }}</h1>
              <p class="page-description">收藏每一份重要，随时找到所需。</p>
            </div>
            <button class="primary-button upload-button" @click="showUploadPopup = true">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 16V4m-4 4 4-4 4 4M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              上传文件
            </button>
          </div>

          <section class="file-panel" aria-label="文件列表" :aria-busy="loading">
            <div class="file-toolbar">
              <nav class="breadcrumbs" aria-label="目录导航">
                <button @click="cwd = ''" :aria-current="!cwd ? 'page' : null">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m3 10 9-7 9 7v10h-6v-6H9v6H3V10Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>
                  全部文件
                </button>
                <template v-for="(part, index) in cwd.split('/').filter(Boolean)" :key="index">
                  <span class="breadcrumb-divider" aria-hidden="true">/</span>
                  <button @click="cwd = cwd.split('/').filter(Boolean).slice(0, index + 1).join('/') + '/'" :aria-current="index === cwd.split('/').filter(Boolean).length - 1 ? 'page' : null">{{ part }}</button>
                </template>
              </nav>
              <div class="toolbar-actions">
                <button class="text-button new-folder-button" @click="createFolder">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3V7Zm9 4v5m-2.5-2.5h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  <span>新建文件夹</span>
                </button>
                <button class="icon-button" @click="fetchFiles" :disabled="loading" aria-label="刷新文件列表" title="刷新文件列表">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" :class="{ spinning: loading }"><path d="M20 10a8 8 0 0 0-14-4L3 9m0-5v5h5M4 14a8 8 0 0 0 14 4l3-3m0 5v-5h-5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
                <div class="menu-button">
                  <button class="icon-button" @click="showMenu = !showMenu" aria-label="排序与文件操作" title="排序与文件操作" :aria-expanded="showMenu">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6h16M4 12h11M4 18h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                  </button>
                  <Menu v-model="showMenu" :items="[{ text: '按照名称排序A-Z' }, { text: '按照大小递增排序' }, { text: '按照大小递减排序' }, { text: '全选/取消全选' }, { text: '粘贴文件到网盘' }]" @click="onMenuClick" />
                </div>
              </div>
            </div>

            <div v-if="loadError" class="list-state error-state" role="alert">
              <span class="state-icon"><svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><circle cx="24" cy="24" r="17" stroke="currentColor" stroke-width="2"/><path d="M24 15v11m0 7v.1" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></span>
              <h2>文件暂时无法加载</h2>
              <p>{{ loadError }}</p>
              <button class="secondary-button" @click="fetchFiles">重新加载</button>
            </div>
            <template v-else>
              <div v-if="loading || filteredFolders.length || filteredFiles.length" class="list-header">
                <input type="checkbox" class="custom-checkbox" :checked="isAllSelected" @change="toggleSelectAll" aria-label="选择当前目录所有项目" :disabled="loading" />
                <span>文件名称</span><span class="column-date">修改时间</span><span class="column-size">大小</span><span class="column-actions"></span>
              </div>
              <div v-if="loading" class="skeleton-list" role="status" aria-live="polite">
                <span class="visually-hidden">正在加载文件</span>
                <div v-for="n in 5" :key="n" class="skeleton-row"><span class="skeleton-icon"></span><span class="skeleton-name"></span><span class="skeleton-meta"></span></div>
              </div>
              <ul v-else-if="filteredFolders.length || filteredFiles.length" class="file-list">
                <li v-for="folder in filteredFolders" :key="folder" :class="{ selected: selectedItems.includes(folder + '_$folder$') }">
                  <div class="file-item" tabindex="0" role="button" @click="cwd = folder" @keydown.enter="cwd = folder" @keydown.space.prevent="cwd = folder" @contextmenu.prevent="focusedItem = folder; showContextMenu = true" :aria-label="'打开文件夹 ' + folder.split('/').filter(Boolean).pop()">
                    <div class="checkbox-wrapper" @click.stop @keydown.stop><input type="checkbox" :value="folder + '_$folder$'" v-model="selectedItems" class="custom-checkbox" :aria-label="'选择文件夹 ' + folder.split('/').filter(Boolean).pop()" /></div>
                    <div class="file-name-cell"><span class="file-icon folder-icon"><svg viewBox="0 0 36 36" fill="none" aria-hidden="true"><path d="M4 11a3 3 0 0 1 3-3h7l3 3h12a3 3 0 0 1 3 3v13a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V11Z" fill="#F7C758"/><path d="M4 16a3 3 0 0 1 3-3h22a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V16Z" fill="#FFD977"/><path d="M9 20h8" stroke="#E5B246" stroke-width="2" stroke-linecap="round"/></svg></span><span class="file-info-container"><span class="file-name">{{ folder.split('/').filter(Boolean).pop() }}</span><span class="file-mobile-meta">文件夹</span></span></div>
                    <span class="column-date file-secondary">—</span><span class="column-size file-secondary">文件夹</span>
                    <button class="icon-button item-actions" @click.stop="focusedItem = folder; showContextMenu = true" @keydown.stop aria-label="文件夹操作"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg></button>
                  </div>
                </li>
                <li v-for="file in filteredFiles" :key="file.key" :class="{ selected: selectedItems.includes(file.key) }">
                  <div class="file-item" tabindex="0" role="button" @click="preview(`/raw/${file.key.split('/').map(encodeURIComponent).join('/')}`)" @keydown.enter="preview(`/raw/${file.key.split('/').map(encodeURIComponent).join('/')}`)" @keydown.space.prevent="preview(`/raw/${file.key.split('/').map(encodeURIComponent).join('/')}`)" @contextmenu.prevent="focusedItem = file; showContextMenu = true" :aria-label="'打开文件 ' + file.key.split('/').pop()">
                    <div class="checkbox-wrapper" @click.stop @keydown.stop><input type="checkbox" :value="file.key" v-model="selectedItems" class="custom-checkbox" :aria-label="'选择文件 ' + file.key.split('/').pop()" /></div>
                    <div class="file-name-cell"><MimeIcon :content-type="file.httpMetadata?.contentType || ''" :thumbnail="file.customMetadata?.thumbnail ? `/raw/_$flaredrive$/thumbnails/${file.customMetadata.thumbnail}.png` : null" :size="25" /><span class="file-info-container"><span class="file-name">{{ file.key.split('/').pop() }}</span><span class="file-mobile-meta">{{ formatSize(file.size) }}<span class="meta-dot">·</span>{{ new Date(file.uploaded).toLocaleDateString() }}</span></span></div>
                    <span class="column-date file-secondary">{{ new Date(file.uploaded).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) }}</span><span class="column-size file-secondary">{{ formatSize(file.size) }}</span>
                    <button class="icon-button item-actions" @click.stop="focusedItem = file; showContextMenu = true" @keydown.stop aria-label="文件操作"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg></button>
                  </div>
                </li>
              </ul>
              <div v-else class="list-state empty-state">
                <span class="state-icon"><svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M10 21a5 5 0 0 1 5-5h13l5 5h16a5 5 0 0 1 5 5v23H10V21Z" fill="#E9F0FF" stroke="#92AFE6" stroke-width="1.5"/><path d="M10 28h44M27 36h10m-5-5v10" stroke="#92AFE6" stroke-width="1.5" stroke-linecap="round"/></svg></span>
                <h2>{{ search ? '没有找到匹配的文件' : '这里还没有文件' }}</h2>
                <p>{{ search ? '换个关键词试试，或清除搜索查看全部文件。' : '上传第一份文件，或新建文件夹开始整理。' }}</p>
                <button v-if="search" class="secondary-button" @click="search = ''">清除搜索</button>
                <button v-else class="secondary-button" @click="showUploadPopup = true">上传文件</button>
              </div>
              <div v-if="!loading && (filteredFolders.length || filteredFiles.length)" class="list-summary"><span>{{ search ? '找到' : '共' }} {{ filteredFolders.length + filteredFiles.length }} 项</span><span class="drop-hint">支持拖拽上传文件</span></div>
            </template>
          </section>

          <div v-if="uploadProgress !== null" class="upload-status" role="status" aria-live="polite"><div><span class="spinner"></span><span>正在处理文件</span><strong>{{ Math.round(uploadProgress) }}%</strong></div><progress :value="uploadProgress" max="100" aria-label="文件处理进度"></progress></div>
        </main>
      </div>

      <UploadPopup v-model="showUploadPopup" @upload="onUploadClicked" @createFolder="createFolder" />
      <transition name="bulk">
        <div v-if="selectedItems.length > 0" class="bulk-action-bar">
          <span class="bulk-info">已选择 <strong>{{ selectedItems.length }}</strong> 项</span>
          <div class="bulk-buttons"><button @click="toggleSelectAll">{{ isAllSelected ? '取消全选' : '全选' }}</button><button @click="selectedItems = []">取消</button><button @click="batchDelete" class="delete-btn">删除选中</button></div>
        </div>
      </transition>
      <Dialog v-if="focusedItem !== null" v-model="showContextMenu">
        <div class="contextmenu-heading"><span class="contextmenu-filename">{{ typeof focusedItem === 'string' ? focusedItem : focusedItem.key }}</span><button class="icon-button" @click.stop="showContextMenu = false" aria-label="关闭文件操作"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div>
        <ul v-if="typeof focusedItem === 'string'" class="contextmenu-list"><li><button @click="copyLink(`/?p=${encodeURIComponent(focusedItem)}`)">复制链接</button></li><li><button @click="moveFile(focusedItem + '_$folder$')">移动</button></li><li><button class="danger-text" @click="removeFile(focusedItem + '_$folder$')">删除</button></li></ul>
        <ul v-else class="contextmenu-list"><li><button @click="renameFile(focusedItem.key)">重命名</button></li><li><a :href="`/raw/${focusedItem.key.split('/').map(encodeURIComponent).join('/')}`" target="_blank" rel="noopener" download>下载</a></li><li><button @click="clipboard = focusedItem.key">复制</button></li><li><button @click="moveFile(focusedItem.key)">移动</button></li><li><button @click="copyLink(`/raw/${focusedItem.key.split('/').map(encodeURIComponent).join('/')}`)">复制链接</button></li><li><button class="danger-text" @click="removeFile(focusedItem.key)">删除</button></li></ul>
      </Dialog>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import {
  generateThumbnail,
  blobDigest,
  multipartUpload,
  SIZE_LIMIT,
} from "./main.mjs";
import Dialog from "./Dialog.vue";
import Menu from "./Menu.vue";
import MimeIcon from "./MimeIcon.vue";
import UploadPopup from "./UploadPopup.vue";

function encodePath(path) {
  return path.split("/").map((part) => encodeURIComponent(part)).join("/");
}

function errorMessage(error, fallback) {
  return error?.response?.data?.error || error?.message || fallback;
}

export default {
  data: () => ({
    isAuthenticated: false,
    requireLogin: false,
    sessionLoading: true,
    usernameInput: "",
    passwordInput: "",
    authenticatedUser: "",
    loginError: "",
    loginPending: false,
    loadError: "",
    cwd: new URL(window.location).searchParams.get("p") || "",
    files: [],
    folders: [],
    clipboard: null,
    focusedItem: null,
    loading: false,
    order: null,
    search: "",
    showContextMenu: false,
    showMenu: false,
    showUploadPopup: false,
    uploadProgress: null,
    uploadQueue: [],
    selectedItems: [],
    fileRequestId: 0,
  }),

  computed: {
    filteredFiles() {
      let files = this.files;
      if (this.search) {
        files = files.filter((file) =>
          file.key.split("/").pop().includes(this.search)
        );
      }
      return files;
    },

    filteredFolders() {
      let folders = this.folders;
      if (this.search) {
        folders = folders.filter((folder) => folder.includes(this.search));
      }
      return folders;
    },

    // 判断是否全选
    isAllSelected() {
      const totalCount = this.filteredFolders.length + this.filteredFiles.length;
      return totalCount > 0 && this.filteredFolders.every((folder) => this.selectedItems.includes(`${folder}_$folder$`))
        && this.filteredFiles.every((file) => this.selectedItems.includes(file.key));
    },
  },

  methods: {
    async restoreSession() {
      this.sessionLoading = true;
      try {
        const response = await fetch("/api/session", { credentials: "same-origin" });
        const session = await response.json();
        if (!response.ok) throw new Error(session.error || "无法确认登录状态。");
        this.isAuthenticated = session.authenticated === true;
        this.requireLogin = false;
        this.authenticatedUser = session.username || "";
        this.loadError = "";
        if (this.isAuthenticated) await this.fetchFiles();
      } catch (error) {
        this.isAuthenticated = false;
        this.authenticatedUser = "";
        this.loadError = errorMessage(error, "无法连接网盘，请检查网络或服务配置。");
      } finally {
        this.sessionLoading = false;
      }
    },

    async submitPassword() {
      if (this.loginPending) return;
      this.loginPending = true;
      this.loginError = "";
      this.loadError = "";
      try {
        const response = await fetch("/api/session", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: this.usernameInput, password: this.passwordInput }),
        });
        const session = await response.json();
        if (!response.ok) throw new Error(session.error || "登录失败，请检查账号和密码。");
        this.isAuthenticated = session.authenticated === true;
        this.requireLogin = false;
        this.authenticatedUser = session.username || "";
        this.passwordInput = "";
        this.loadError = "";
        if (this.isAuthenticated) await this.fetchFiles();
      } catch (error) {
        this.loginError = errorMessage(error, "登录失败，请检查网络后重试。");
      } finally {
        this.loginPending = false;
      }
    },

    async logout() {
      this.loginError = "";
      this.loadError = "";
      if (!this.authenticatedUser) {
        this.requireLogin = true;
        this.files = [];
        this.folders = [];
        return;
      }
      try {
        const response = await fetch("/api/session", { method: "DELETE", credentials: "same-origin" });
        if (!response.ok) throw new Error("退出登录失败，请重试。");
        const session = await response.json();
        this.isAuthenticated = session.authenticated === true;
        this.requireLogin = true;
        this.authenticatedUser = session.username || "";
        this.files = [];
        this.folders = [];
        this.selectedItems = [];
        if (this.isAuthenticated) await this.fetchFiles();
      } catch (error) {
        this.loadError = errorMessage(error, "退出登录失败，请重试。");
      }
    },

    async copyLink(link) {
      const url = new URL(link, window.location.origin);
      try {
        await navigator.clipboard.writeText(url.toString());
        this.showContextMenu = false;
      } catch {
        window.prompt("复制此链接：", url.toString());
      }
    },

    async copyPaste(source, target) {
      const uploadUrl = `/api/write/items/${encodePath(target)}`;
      await axios.put(uploadUrl, "", {
        headers: { "x-amz-copy-source": encodeURIComponent(source) },
      });
    },

    async createFolder() {
      try {
        const folderName = window.prompt("请输入文件夹名称");
        if (!folderName) return;
        if (folderName.includes("/") || folderName === "." || folderName === "..") {
          alert("文件夹名称不能包含斜杠。");
          return;
        }
        this.showUploadPopup = false;
        const uploadUrl = `/api/write/items/${encodePath(`${this.cwd}${folderName}/_$folder$`)}`;
        await axios.put(uploadUrl, "");
        await this.fetchFiles();
      } catch (error) {
        this.loadError = errorMessage(error, "创建文件夹失败，请检查写入权限后重试。");
      }
    },

    async fetchFiles() {
      if (!this.isAuthenticated) return;

      const requestId = ++this.fileRequestId;
      const path = this.cwd.replace(/^\/+|\/+$/g, "");
      this.files = [];
      this.folders = [];
      this.loading = true;
      this.loadError = "";

      try {
        const files = [];
        const folders = new Set();
        let cursor = null;
        do {
          const url = new URL(`/api/children/${encodePath(path)}`, window.location.origin);
          if (cursor) url.searchParams.set("cursor", cursor);
          const response = await fetch(url, { credentials: "same-origin" });
          const page = await response.json();
          if (!response.ok) throw new Error(page.error || "文件列表加载失败。");
          files.push(...(page.value || []));
          for (const folder of page.folders || []) folders.add(folder);
          cursor = page.cursor || page.marker || null;
        } while (cursor && requestId === this.fileRequestId);

        if (requestId !== this.fileRequestId) return;
        this.files = files;
        this.folders = [...folders];
        this.files.sort((a, b) => {
          if (this.order === "大小↑") return a.size - b.size;
          if (this.order === "大小↓") return b.size - a.size;
          return a.key.localeCompare(b.key);
        });
      } catch (error) {
        if (requestId === this.fileRequestId) {
          this.loadError = errorMessage(error, "文件列表加载失败，请重试。");
        }
      } finally {
        if (requestId === this.fileRequestId) this.loading = false;
      }
    },

    formatSize(size) {
      const units = ["B", "KB", "MB", "GB", "TB"];
      let index = 0;
      while (size >= 1024 && index < units.length - 1) {
        size /= 1024;
        index++;
      }
      return `${size.toFixed(1)} ${units[index]}`;
    },

    onDrop(event) {
      const files = event.dataTransfer.items
        ? [...event.dataTransfer.items].filter((item) => item.kind === "file").map((item) => item.getAsFile()).filter(Boolean)
        : [...event.dataTransfer.files];
      this.uploadFiles(files);
    },

    toggleSelectAll() {
      const visibleFolders = this.filteredFolders.map((folder) => `${folder}_$folder$`);
      const visibleFiles = this.filteredFiles.map((file) => file.key);
      if (this.isAllSelected) {
        const visible = new Set([...visibleFolders, ...visibleFiles]);
        this.selectedItems = this.selectedItems.filter((item) => !visible.has(item));
      } else {
        this.selectedItems = [...new Set([...this.selectedItems, ...visibleFolders, ...visibleFiles])];
      }
    },

    onMenuClick(text) {
      switch (text) {
        case "按照名称排序A-Z": this.order = null; break;
        case "按照大小递增排序": this.order = "大小↑"; break;
        case "按照大小递减排序": this.order = "大小↓"; break;
        case "全选/取消全选": this.toggleSelectAll(); return;
        case "粘贴文件到网盘": this.pasteFile(); return;
      }
      this.files.sort((a, b) => this.order === "大小↑" ? a.size - b.size
        : this.order === "大小↓" ? b.size - a.size : a.key.localeCompare(b.key));
    },

    onUploadClicked(fileElement) {
      if (!fileElement.value) return;
      this.uploadFiles(fileElement.files);
      this.showUploadPopup = false;
      fileElement.value = "";
    },

    preview(filePath) {
      window.open(filePath, "_blank", "noopener,noreferrer");
    },

    async pasteFile() {
      if (!this.clipboard) return;
      let newName = window.prompt("另存为：");
      if (newName === null) return;
      if (newName === "") newName = this.clipboard.split("/").pop();
      try {
        await this.copyPaste(this.clipboard, `${this.cwd}${newName}`);
        await this.fetchFiles();
      } catch (error) {
        this.loadError = errorMessage(error, "复制文件失败，请检查写入权限后重试。");
      }
    },

    async processUploadQueue() {
      if (!this.uploadQueue.length) {
        await this.fetchFiles();
        this.uploadProgress = null;
        return;
      }

      const { basedir, file } = this.uploadQueue.shift();
      let thumbnailDigest = null;
      if (file.type.startsWith("image/") || file.type === "video/mp4") {
        try {
          const thumbnailBlob = await generateThumbnail(file);
          const digestHex = await blobDigest(thumbnailBlob);
          await axios.put(`/api/write/items/${encodePath(`_$flaredrive$/thumbnails/${digestHex}.png`)}`, thumbnailBlob);
          thumbnailDigest = digestHex;
        } catch (error) {
          console.warn("Thumbnail creation failed", error);
        }
      }

      try {
        const key = `${basedir}${file.name}`;
        const headers = thumbnailDigest ? { "fd-thumbnail": thumbnailDigest } : {};
        const onUploadProgress = (progressEvent) => {
          if (progressEvent.total) this.uploadProgress = (progressEvent.loaded * 100) / progressEvent.total;
        };
        if (file.size >= SIZE_LIMIT) {
          await multipartUpload(key, file, { headers, onUploadProgress });
        } else {
          await axios.put(`/api/write/items/${encodePath(key)}`, file, { headers, onUploadProgress });
        }
        this.loadError = "";
      } catch (error) {
        this.loadError = errorMessage(error, `上传“${file.name}”失败，请检查写入权限后重试。`);
      }
      setTimeout(() => this.processUploadQueue(), 0);
    },

    async removeFile(key) {
      if (!window.confirm(`确定要删除 ${key} 吗？`)) return;
      try {
        const keys = key.endsWith("_$folder$")
          ? [...(await this.getAllItems(key.slice(0, -9))).map((item) => item.key), key]
          : [key];
        for (const itemKey of [...new Set(keys)]) {
          await axios.delete(`/api/write/items/${encodePath(itemKey)}`);
        }
        this.showContextMenu = false;
        await this.fetchFiles();
      } catch (error) {
        this.loadError = errorMessage(error, "删除失败，请检查写入权限后重试。");
      }
    },

    async batchDelete() {
      const selected = [...this.selectedItems];
      if (!selected.length || !window.confirm(`确定要永久删除这 ${selected.length} 个项目吗？`)) return;
      this.loading = true;
      try {
        const keys = new Set();
        for (const key of selected) {
          if (key.endsWith("_$folder$")) {
            for (const item of await this.getAllItems(key.slice(0, -9))) keys.add(item.key);
          }
          keys.add(key);
        }
        for (const key of keys) await axios.delete(`/api/write/items/${encodePath(key)}`);
        this.selectedItems = [];
        await this.fetchFiles();
      } catch (error) {
        this.loadError = errorMessage(error, "部分项目删除失败，请重试。");
      } finally {
        this.loading = false;
      }
    },

    async renameFile(key) {
      const newName = window.prompt("重命名为：");
      if (!newName || newName.includes("/")) return;
      if (newName === key.split("/").pop()) {
        this.showContextMenu = false;
        return;
      }
      try {
        await this.copyPaste(key, `${this.cwd}${newName}`);
        await axios.delete(`/api/write/items/${encodePath(key)}`);
        this.showContextMenu = false;
        await this.fetchFiles();
      } catch (error) {
        this.loadError = errorMessage(error, "重命名失败，请重试。");
      }
    },

    async moveFile(key) {
      const folders = [...new Set(["", ...this.folders])];
      const options = folders.map((folder, index) => `${index + 1}. ${folder || "根目录"}`).join("\n");
      const selection = window.prompt(`请选择目标目录（输入序号）：\n${options}`);
      if (!selection) return;
      const index = Number.parseInt(selection, 10) - 1;
      if (!Number.isInteger(index) || index < 0 || index >= folders.length) {
        alert("无效的选择。");
        return;
      }

      const target = folders[index];
      const isFolder = key.endsWith("_$folder$");
      const sourceBasePath = isFolder ? key.slice(0, -9) : "";
      const sourcePrefix = isFolder ? `${sourceBasePath.replace(/\/+$/, "")}/` : "";
      const fileName = isFolder
        ? sourceBasePath.replace(/\/$/, "").split("/").pop()
        : key.split("/").pop();
      const folderName = fileName;
      const normalizedTarget = target && !target.endsWith("/") ? `${target}/` : target;
      const targetPath = `${normalizedTarget}${folderName}`;
      if (targetPath === (isFolder ? sourceBasePath.replace(/\/$/, "") : key)) {
        this.showContextMenu = false;
        return;
      }
      if (isFolder && targetPath.startsWith(`${sourceBasePath.replace(/\/$/, "")}/`)) {
        this.loadError = "不能将文件夹移动到自身或其子文件夹中。";
        return;
      }
      try {
        if (isFolder) {
          const items = await this.getAllItems(sourcePrefix);
          let processed = 0;
          for (const item of items) {
            const relativePath = item.key.substring(sourcePrefix.length);
            const destinationKey = `${targetPath}/${relativePath}`;
            if (item.isFolderMarker) {
              await axios.put(`/api/write/items/${encodePath(destinationKey)}`, "");
            } else {
              await this.copyPaste(item.key, destinationKey);
            }
            await axios.delete(`/api/write/items/${encodePath(item.key)}`);
            processed++;
            this.uploadProgress = items.length ? (processed / items.length) * 100 : 100;
          }
          await axios.put(`/api/write/items/${encodePath(`${targetPath}/_$folder$`)}`, "");
          await axios.delete(`/api/write/items/${encodePath(key)}`);
        } else {
          await this.copyPaste(key, targetPath);
          await axios.delete(`/api/write/items/${encodePath(key)}`);
        }
        this.showContextMenu = false;
        await this.fetchFiles();
      } catch (error) {
        this.loadError = errorMessage(error, "移动失败，请检查目标目录和写入权限。");
      } finally {
        this.uploadProgress = null;
      }
    },

    async getAllItems(prefix) {
      const items = [];
      let cursor = null;
      do {
        const url = new URL(`/api/children/${encodePath(prefix)}`, window.location.origin);
        if (cursor) url.searchParams.set("cursor", cursor);
        const response = await fetch(url, { credentials: "same-origin" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "读取目录失败。");
        items.push(...(data.value || []));
        for (const folder of data.folders || []) {
          items.push({ key: `${folder}_$folder$`, size: 0, uploaded: new Date().toISOString(), isFolderMarker: true });
          items.push(...await this.getAllItems(folder));
        }
        cursor = data.cursor || data.marker || null;
      } while (cursor);
      return items;
    },

    uploadFiles(files) {
      const basedir = this.cwd && !this.cwd.endsWith("/") ? `${this.cwd}/` : this.cwd;
      this.uploadQueue.push(...Array.from(files).map((file) => ({ basedir, file })));
      if (this.uploadQueue.length === files.length) setTimeout(() => this.processUploadQueue(), 0);
    },
  },

  watch: {
    cwd() {
      this.selectedItems = [];
      this.search = "";
      if (this.isAuthenticated) this.fetchFiles();
      const url = new URL(window.location);
      if ((url.searchParams.get("p") || "") !== this.cwd) {
        this.cwd ? url.searchParams.set("p", this.cwd) : url.searchParams.delete("p");
        window.history.pushState(null, "", url.toString());
      }
      const currentFolder = this.cwd.split("/").filter(Boolean).pop();
      document.title = currentFolder ? `${currentFolder} · FlareDrive 文件库` : "FlareDrive 文件库";
    },
  },

  created() {
    this.restoreSession();
    window.addEventListener("popstate", () => {
      const path = new URL(window.location).searchParams.get("p") || "";
      if (path !== this.cwd) this.cwd = path;
    });
  },

  components: {
    Dialog,
    Menu,
    MimeIcon,
    UploadPopup,
  },
};
</script>
