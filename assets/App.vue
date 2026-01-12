<template>
  <div style="height: 100%; width: 100%;">
    
    <div v-if="!isAuthenticated" class="login-overlay" :style="{ backgroundImage: `url('${backgroundImageUrl}')` }">
      <div class="login-box">
        <img src="/assets/homescreen.png" alt="Logo" style="height: 48px; margin-bottom: 20px;" />
        <h2 style="margin-bottom: 20px; color: #333;">请输入访问密码</h2>
        <input 
          type="password" 
          v-model="passwordInput" 
          @keyup.enter="submitPassword"
          placeholder="输入密码"
          style="padding: 10px; width: 80%; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 4px;"
        />
        <button @click="submitPassword" class="login-btn">
          进入网盘
        </button>
      </div>
    </div>

    <div class="main" v-else
        @dragenter.prevent 
        @dragover.prevent 
        @drop.prevent="onDrop"
        :style="{ backgroundImage: `url('${backgroundImageUrl}')` }"
    >
      <progress v-if="uploadProgress !== null" :value="uploadProgress" max="100"></progress>
      <UploadPopup v-model="showUploadPopup" @upload="onUploadClicked" @createFolder="createFolder"></UploadPopup>
      <button class="upload-button circle" @click="showUploadPopup = true">
        <svg t="1741764069699" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"
          p-id="24280" width="24" height="24">
          <path
            d="M576 557.7088V934.4H448V560.4416l-43.8912 43.8848L313.6 513.8176l199.1232-199.1168 0.64 0.64 0.64-0.64 199.1232 199.1168-90.5088 90.5088L576 557.7088zM704 678.4h32c88.3648 0 160-71.6352 160-160s-71.6352-160-160-160c-20.5184 0-40.128 3.8592-58.1568 10.8992C670.336 270.1248 587.4944 192 486.4 192c-106.0416 0-192 85.9584-192 192 0 15.9104 1.9328 31.3728 5.5872 46.1568A127.7504 127.7504 0 0 0 256 422.4c-70.6944 0-128 57.3056-128 128s57.3056 128 128 128h64v128H256c-141.3824 0-256-114.6176-256-256 0-113.3184 73.632-209.4464 175.6608-243.136C210.0352 167.584 336.1216 64 486.4 64c121.312 0 227.552 67.712 281.7728 168.1792C912.0896 248.1792 1024 370.2208 1024 518.4c0 159.0592-128.9408 288-288 288h-32v-128z"
            fill="#e6e6e6" p-id="24281"></path>
        </svg>
      </button>
      <div class="app-bar">
        <a class="app-title-container" style="display: flex; align-items: center;" href="/">
          <img src="/assets/homescreen.png" alt="FlareDrive" style="height: 24px" />
          <h1 class="app-title" style="font-size: 20px;margin: 0 25px 0 8px; user-select: none;">FlareDrive</h1>
        </a>

        <input type="search" v-model="search" aria-label="Search" placeholder="🍿 输入以全局搜索文件" />
        <div class="menu-button">
          <button class="circle" @click="showMenu = true" style="display: flex; align-items: center;background-color: rgb(245, 245, 245);">
            <p style="
                white-space: nowrap;
                margin: 0 10px 0 0;
                font-size: 16px;
                font-family: '寒蝉半圆体', -apple-system, BlinkMacSystemFont, 'Segoe UI Adjusted',
      'Segoe UI', 'Liberation Sans', sans-serif;"
                class="menu-button-text">
              菜单
            </p>
            <svg t="1741761597964" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"
              p-id="22027" width="24" height="24">
              <path
                d="M365 663.5v210.7c0 18.6-23.4 26.8-35 12.3L131.2 637.9c-13.3-16.6-1.5-41.1 19.8-41.1h80.7v-400c0-36.8 29.8-66.7 66.7-66.7 36.8 0 66.7 29.8 66.7 66.7v466.7h-0.1z m200-466.7h266.7c36.8 0 66.7 29.8 66.7 66.7s-29.8 66.7-66.7 66.7H565c-36.8 0-66.7-29.8-66.7-66.7 0-36.8 29.9-66.7 66.7-66.7z m0 266.7h200c36.8 0 66.7 29.8 66.7 66.6s-29.8 66.7-66.6 66.7H565c-36.8 0-66.7-29.8-66.7-66.7 0.1-36.8 29.9-66.6 66.7-66.6z m0 266.7h133.3c36.8 0 66.7 29.8 66.7 66.7 0 36.8-29.8 66.7-66.7 66.7H565c-36.8 0-66.7-29.8-66.7-66.7 0.1-36.9 29.9-66.7 66.7-66.7z"
                p-id="22028" fill="#2c2c2c"></path>
            </svg>
          </button>
          <Menu v-model="showMenu"
            :items="[{ text: '按照名称排序A-Z' }, { text: '按照大小递增排序' }, { text: '按照大小递减排序' }, { text: '粘贴文件到网盘' }]"
            @click="onMenuClick" />
        </div>
      </div>
      <div class="file-list-container">
        <ul class="file-list">
          <li v-if="cwd !== ''">
            <div tabindex="0" class="file-item back-item" @click="cwd = cwd.replace(/[^\/]+\/$/, '')" @contextmenu.prevent>
              <div class="file-icon">
                <svg  viewBox="0 0 576 512"
                  xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="#555">
                  <path d="M384 480l48 0c11.4 0 21.9-6 27.6-15.9l112-192c5.8-9.9 5.8-22.1 .1-32.1S555.5 224 544 224l-400 0c-11.4 0-21.9 6-27.6 15.9L48 357.1 48 96c0-8.8 7.2-16 16-16l117.5 0c4.2 0 8.3 1.7 11.3 4.7l26.5 26.5c21 21 49.5 32.8 79.2 32.8L416 144c8.8 0 16 7.2 16 16l0 32 48 0 0-32c0-35.3-28.7-64-64-64L298.5 96c-17 0-33.3-6.7-45.3-18.7L226.7 50.7c-12-12-28.3-18.7-45.3-18.7L64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l23.7 0L384 480z"/>
                </svg>
              </div>
              <div class="file-info-container"><span class="file-name">.. (返回上级)</span></div>
            </div>
          </li>
          <li v-for="folder in filteredFolders" :key="folder">
            <div tabindex="0" class="file-item folder-item" @click="cwd = folder" @contextmenu.prevent="
              showContextMenu = true;
              focusedItem = folder;
              ">
              <div class="file-icon">
                <svg  viewBox="0 0 576 512"
                  xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#F4B400">
                  <path d="M384 480l48 0c11.4 0 21.9-6 27.6-15.9l112-192c5.8-9.9 5.8-22.1 .1-32.1S555.5 224 544 224l-400 0c-11.4 0-21.9 6-27.6 15.9L48 357.1 48 96c0-8.8 7.2-16 16-16l117.5 0c4.2 0 8.3 1.7 11.3 4.7l26.5 26.5c21 21 49.5 32.8 79.2 32.8L416 144c8.8 0 16 7.2 16 16l0 32 48 0 0-32c0-35.3-28.7-64-64-64L298.5 96c-17 0-33.3-6.7-45.3-18.7L226.7 50.7c-12-12-28.3-18.7-45.3-18.7L64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l23.7 0L384 480z"/>
                </svg>
              </div>
              <div class="file-info-container">
                  <span class="file-name" v-text="folder.match(/.*?([^/]*)\/?$/)[1]"></span>
                  <span class="file-attr">文件夹</span>
              </div>
              <div class="action-btn" @click.stop="
                showContextMenu = true;
                focusedItem = folder;
                ">
                <svg t="1741761103305" class="icon" viewBox="0 0 1024 1024" version="1.1"
                  xmlns="http://www.w3.org/2000/svg" p-id="6484" width="20" height="20">
                  <path
                    d="M341.333333 533.333333a128 128 0 0 1 128 128v149.333334a128 128 0 0 1-128 128H192a128 128 0 0 1-128-128v-149.333334a128 128 0 0 1 128-128h149.333333z m469.333334 0a128 128 0 0 1 128 128v149.333334a128 128 0 0 1-128 128h-149.333334a128 128 0 0 1-128-128v-149.333334a128 128 0 0 1 128-128h149.333334z m-469.333334 64H192a64 64 0 0 0-63.893333 60.245334L128 661.333333v149.333334a64 64 0 0 0 60.245333 63.893333L192 874.666667h149.333333a64 64 0 0 0 63.893334-60.245334L405.333333 810.666667v-149.333334a64 64 0 0 0-60.245333-63.893333L341.333333 597.333333z m469.333334 0h-149.333334a64 64 0 0 0-63.893333 60.245334L597.333333 661.333333v149.333334a64 64 0 0 0 60.245334 63.893333L661.333333 874.666667h149.333334a64 64 0 0 0 63.893333-60.245334L874.666667 810.666667v-149.333334a64 64 0 0 0-60.245334-63.893333L810.666667 597.333333zM341.333333 64a128 128 0 0 1 128 128v149.333333a128 128 0 0 1-128 128H192a128 128 0 0 1-128-128V192a128 128 0 0 1 128-128h149.333333z m469.333334 0a128 128 0 0 1 128 128v149.333333a128 128 0 0 1-128 128h-149.333334a128 128 0 0 1-128-128V192a128 128 0 0 1 128-128h149.333334zM341.333333 128H192a64 64 0 0 0-63.893333 60.245333L128 192v149.333333a64 64 0 0 0 60.245333 63.893334L192 405.333333h149.333333a64 64 0 0 0 63.893334-60.245333L405.333333 341.333333V192a64 64 0 0 0-60.245333-63.893333L341.333333 128z m469.333334 0h-149.333334a64 64 0 0 0-63.893333 60.245333L597.333333 192v149.333333a64 64 0 0 0 60.245334 63.893334L661.333333 405.333333h149.333334a64 64 0 0 0 63.893333-60.245333L874.666667 341.333333V192a64 64 0 0 0-60.245334-63.893333L810.666667 128z"
                    fill="#999" p-id="6485"></path>
                </svg>
              </div>
            </div>
          </li>
          <li v-for="file in filteredFiles" :key="file.key">
            <div @click="preview(`/raw/${file.key}`)" @contextmenu.prevent="
              showContextMenu = true;
              focusedItem = file;" class="file-item file-row" style="position: relative;">
              <MimeIcon :content-type="file.httpMetadata.contentType" :thumbnail="file.customMetadata.thumbnail
                ? `/raw/_$flaredrive$/thumbnails/${file.customMetadata.thumbnail}.png`
                : null
                " />
              <div class="file-info-container">
                <div class="file-name" v-text="file.key.split('/').pop()"></div>
                <div class="file-attr">
                  <span class="file-date" v-text="new Date(file.uploaded).toLocaleString()"></span>
                  <span class="file-separator">|</span>
                  <span class="file-size" v-text="formatSize(file.size)"></span>
                </div>
              </div>
              <div class="action-btn" @click.stop="
                showContextMenu = true;
                focusedItem = file;
                ">
                <svg t="1741761103305" class="icon" viewBox="0 0 1024 1024" version="1.1"
                  xmlns="http://www.w3.org/2000/svg" p-id="6484" width="20" height="20">
                  <path
                    d="M341.333333 533.333333a128 128 0 0 1 128 128v149.333334a128 128 0 0 1-128 128H192a128 128 0 0 1-128-128v-149.333334a128 128 0 0 1 128-128h149.333333z m469.333334 0a128 128 0 0 1 128 128v149.333334a128 128 0 0 1-128 128h-149.333334a128 128 0 0 1-128-128v-149.333334a128 128 0 0 1 128-128h149.333334z m-469.333334 64H192a64 64 0 0 0-63.893333 60.245334L128 661.333333v149.333334a64 64 0 0 0 60.245333 63.893333L192 874.666667h149.333333a64 64 0 0 0 63.893334-60.245334L405.333333 810.666667v-149.333334a64 64 0 0 0-60.245333-63.893333L341.333333 597.333333z m469.333334 0h-149.333334a64 64 0 0 0-63.893333 60.245334L597.333333 661.333333v149.333334a64 64 0 0 0 60.245334 63.893333L661.333333 874.666667h149.333334a64 64 0 0 0 63.893333-60.245334L874.666667 810.666667v-149.333334a64 64 0 0 0-60.245334-63.893333L810.666667 597.333333zM341.333333 64a128 128 0 0 1 128 128v149.333333a128 128 0 0 1-128 128H192a128 128 0 0 1-128-128V192a128 128 0 0 1 128-128h149.333333z m469.333334 0a128 128 0 0 1 128 128v149.333333a128 128 0 0 1-128 128h-149.333334a128 128 0 0 1-128-128V192a128 128 0 0 1 128-128h149.333334zM341.333333 128H192a64 64 0 0 0-63.893333 60.245333L128 192v149.333333a64 64 0 0 0 60.245333 63.893334L192 405.333333h149.333333a64 64 0 0 0 63.893334-60.245333L405.333333 341.333333V192a64 64 0 0 0-60.245333-63.893333L341.333333 128z m469.333334 0h-149.333334a64 64 0 0 0-63.893333 60.245333L597.333333 192v149.333333a64 64 0 0 0 60.245334 63.893334L661.333333 405.333333h149.333334a64 64 0 0 0 63.893333-60.245333L874.666667 341.333333V192a64 64 0 0 0-60.245334-63.893333L810.666667 128z"
                    fill="#999" p-id="6485"></path>
                </svg>
              </div>
            </div>
          </li>
        </ul>
      </div>
      <div v-if="loading" style="margin: 20px 0; text-align: center">
        <span style="font-size: 20px;">加载中...</span>
      </div>
      <div v-else-if="!filteredFiles.length && !filteredFolders.length" style="margin: 20px 0; text-align: center">
        <span style="font-size: 20px;">没有文件</span>
      </div>
      <Dialog v-model="showContextMenu">
        <div
          style="height: 50px;display: flex; justify-content: center; align-items: center; padding:10px; background: #ddd; margin: 0 0 10px 0; border-radius: 8px;">
          <div v-text="focusedItem.key || focusedItem" class="contextmenu-filename" @click.stop.prevent
            style="height:20px;width: 100%; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"></div>
        </div>
        <ul v-if="typeof focusedItem === 'string'" class="contextmenu-list">
          <li>
            <button @click="copyLink(`/?p=${encodeURIComponent(focusedItem)}`)">
              <span>复制链接</span>
            </button>
          </li>
          <li>
            <button @click="moveFile(focusedItem + '_$folder$')">
              <span>移动</span>
            </button>
          </li>
          <li>
            <button style="color: red" @click="removeFile(focusedItem + '_$folder$')">
              <span>删除</span>
            </button>
          </li>
        </ul>
        <ul v-else class="contextmenu-list">
          <li>
            <button @click="renameFile(focusedItem.key)">
              <span>重命名</span>
            </button>
          </li>
          <li>
            <a :href="`/raw/${focusedItem.key}`" target="_blank" download>
              <span>下载</span>
            </a>
          </li>
          <li>
            <button @click="clipboard = focusedItem.key">
              <span>复制</span>
            </button>
          </li>
          <li>
            <button @click="moveFile(focusedItem.key)">
              <span>移动</span>
            </button>
          </li>
          <li>
            <button @click="copyLink(`/raw/${focusedItem.key}`)">
              <span>复制链接</span>
            </button>
          </li>
          <li>
            <button style="color: red" @click="removeFile(focusedItem.key)">
              <span>删除</span>
            </button>
          </li>
        </ul>
      </Dialog>
      <div style="flex:1"></div>
      <Footer />
    </div>
  </div>
</template>

<script>
import {
  generateThumbnail,
  blobDigest,
  multipartUpload,
  SIZE_LIMIT,
} from "/assets/main.mjs";
import Dialog from "./Dialog.vue";
import Menu from "./Menu.vue";
import MimeIcon from "./MimeIcon.vue";
import UploadPopup from "./UploadPopup.vue";
import Footer from "./Footer.vue";

export default {
  data: () => ({
    isAuthenticated: false, // 认证状态
    passwordInput: "",      // 密码输入框
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
    backgroundImageUrl: "/assets/bg-light.webp"
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
  },

  methods: {
    submitPassword() {
      if (this.passwordInput === "hejianwei") {
        this.isAuthenticated = true;
        localStorage.setItem("flaredrive_auth", "hejianwei"); // 记住登录状态
        this.fetchFiles(); // 登录成功后立即加载文件
      } else {
        alert("密码错误！");
        this.passwordInput = "";
      }
    },

    copyLink(link) {
      const url = new URL(link, window.location.origin);
      navigator.clipboard.writeText(url.toString());
    },

    async copyPaste(source, target) {
      const uploadUrl = `/api/write/items/${target}`;
      await axios.put(uploadUrl, "", {
        headers: { "x-amz-copy-source": encodeURIComponent(source) },
      });
    },

    async createFolder() {
      try {
        const folderName = window.prompt("请输入文件夹名称");
        if (!folderName) return;
        this.showUploadPopup = false;
        const uploadUrl = `/api/write/items/${this.cwd}${folderName}/_$folder$`;
        await axios.put(uploadUrl, "");
        this.fetchFiles();
      } catch (error) {
        fetch("/api/write/")
          .then((value) => {
            if (value.redirected) window.location.href = value.url;
          })
          .catch(() => { });
        console.log(`Create folder failed`);
      }
    },

    fetchFiles() {
      // 只有认证通过才加载文件
      if (!this.isAuthenticated) return;

      this.files = [];
      this.folders = [];
      this.loading = true;
      fetch(`/api/children/${this.cwd}`)
        .then((res) => res.json())
        .then((files) => {
          this.files = files.value;
          if (this.order) {
            this.files.sort((a, b) => {
              if (this.order === "size") {
                return b.size - a.size;
              }
            });
          }
          this.folders = files.folders;
          this.loading = false;
        });
    },

    formatSize(size) {
      const units = ["B", "KB", "MB", "GB", "TB"];
      let i = 0;
      while (size >= 1024) {
        size /= 1024;
        i++;
      }
      return `${size.toFixed(1)} ${units[i]}`;
    },

    onDrop(ev) {
      let files;
      if (ev.dataTransfer.items) {
        files = [...ev.dataTransfer.items]
          .filter((item) => item.kind === "file")
          .map((item) => item.getAsFile());
      } else files = ev.dataTransfer.files;
      this.uploadFiles(files);
    },

    onMenuClick(text) {
      switch (text) {
        case "按照名称排序A-Z":
          this.order = null;
          break;
        case "按照大小递增排序":
          this.order = "大小↑";
          break;
        case "按照大小递减排序":
          this.order = "大小↓";
          break;
        case "粘贴文件到网盘":
          return this.pasteFile();
      }
      this.files.sort((a, b) => {
        if (this.order === "大小↑") {
          return a.size - b.size;
        } else if (this.order === "大小↓") {
          return b.size - a.size;
        } else {
          return a.key.localeCompare(b.key);
        }
      });
    },

    onUploadClicked(fileElement) {
      if (!fileElement.value) return;
      this.uploadFiles(fileElement.files);
      this.showUploadPopup = false;
      fileElement.value = null;
    },

    preview(filePath) {
      window.open(filePath);
    },

    async pasteFile() {
      if (!this.clipboard) return;
      let newName = window.prompt("Rename to:");
      if (newName === null) return;
      if (newName === "") newName = this.clipboard.split("/").pop();
      await this.copyPaste(this.clipboard, `${this.cwd}${newName}`);
      this.fetchFiles();
    },

    async processUploadQueue() {
      if (!this.uploadQueue.length) {
        this.fetchFiles();
        this.uploadProgress = null;
        return;
      }

      /** @type File **/
      const { basedir, file } = this.uploadQueue.pop(0);
      let thumbnailDigest = null;

      if (file.type.startsWith("image/") || file.type === "video/mp4") {
        try {
          const thumbnailBlob = await generateThumbnail(file);
          const digestHex = await blobDigest(thumbnailBlob);

          const thumbnailUploadUrl = `/api/write/items/_$flaredrive$/thumbnails/${digestHex}.png`;
          try {
            await axios.put(thumbnailUploadUrl, thumbnailBlob);
            thumbnailDigest = digestHex;
          } catch (error) {
            fetch("/api/write/")
              .then((value) => {
                if (value.redirected) window.location.href = value.url;
              })
              .catch(() => { });
            console.log(`Upload ${digestHex}.png failed`);
          }
        } catch (error) {
          console.log(`Generate thumbnail failed`);
        }
      }

      try {
        const uploadUrl = `/api/write/items/${basedir}${file.name}`;
        const headers = {};
        const onUploadProgress = (progressEvent) => {
          var percentCompleted =
            (progressEvent.loaded * 100) / progressEvent.total;
          this.uploadProgress = percentCompleted;
        };
        if (thumbnailDigest) headers["fd-thumbnail"] = thumbnailDigest;
        if (file.size >= SIZE_LIMIT) {
          await multipartUpload(`${basedir}${file.name}`, file, {
            headers,
            onUploadProgress,
          });
        } else {
          await axios.put(uploadUrl, file, { headers, onUploadProgress });
        }
      } catch (error) {
        fetch("/api/write/")
          .then((value) => {
            if (value.redirected) window.location.href = value.url;
          })
          .catch(() => { });
        console.log(`Upload ${file.name} failed`, error);
      }
      setTimeout(this.processUploadQueue);
    },

    async removeFile(key) {
      if (!window.confirm(`确定要删除 ${key} 吗？`)) return;
      await axios.delete(`/api/write/items/${key}`);
      this.fetchFiles();
    },

    async renameFile(key) {
      const newName = window.prompt("重命名为:");
      if (!newName) return;
      await this.copyPaste(key, `${this.cwd}${newName}`);
      await axios.delete(`/api/write/items/${key}`);
      this.fetchFiles();
    },

    async moveFile(key) {
      // 获取当前的目录结构
      const currentPath = this.cwd; // 当前所在目录
      const allFolders = [...this.folders]; // 所有可用目录

      // 如果不在根目录，添加返回上级目录选项
      if (currentPath !== '') {
        const parentPath = currentPath.replace(/[^\/]+\/$/, '');
        if (!allFolders.includes(parentPath) && parentPath !== '') {
          allFolders.unshift(parentPath);
        }
      }

      // 添加根目录选项
      if (!allFolders.includes('')) {
        allFolders.unshift('');
      }

      // 构建选择列表
      const folderOptions = allFolders.map(folder => {
        const displayName = folder === '' ? '根目录' :
          folder === currentPath ? '当前目录' :
            folder.replace(/.*\/(?!$)|\//g, '') + '/';
        return {
          display: displayName,
          value: folder
        };
      });

      // 创建选择提示
      const options = folderOptions.map((opt, index) =>
        `${index + 1}. ${opt.display}`
      ).join('\n');

      const promptText = `请选择目标目录(输入数字):\n${options}\n`;
      const selection = window.prompt(promptText);

      if (!selection) return;

      const selectedIndex = parseInt(selection) - 1;
      if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= folderOptions.length) {
        alert('无效的选择');
        return;
      }

      const targetPath = folderOptions[selectedIndex].value;

      // 获取文件名
      const fileName = key.split('/').pop();
      // 如果是文件夹,需要移除_$folder$后缀
      const finalFileName = fileName.endsWith('_$folder$') ? fileName.slice(0, -9) : fileName;

      // 修复：正确处理目标路径，避免双斜杠
      const normalizedPath = targetPath === '' ? '' : (targetPath.endsWith('/') ? targetPath : targetPath + '/');

      try {
        // 如果是目录（以_$folder$结尾），则需要移动整个目录内容
        if (key.endsWith('_$folder$')) {
          // 获取源目录的基础路径（移除_$folder$后缀）
          const sourceBasePath = key.slice(0, -9);
          // 获取目标目录的基础路径，修复根目录的情况
          const targetBasePath = normalizedPath + finalFileName + '/';

          // 递归获取所有子文件和子目录
          const allItems = await this.getAllItems(sourceBasePath);

          // 显示进度提示
          const totalItems = allItems.length;
          let processedItems = 0;

          // 移动所有项目
          for (const item of allItems) {
            const relativePath = item.key.substring(sourceBasePath.length);
            const newPath = targetBasePath + relativePath;

            try {
              // 复制到新位置
              await this.copyPaste(item.key, newPath);
              // 删除原位置
              await axios.delete(`/api/write/items/${item.key}`);

              // 更新进度
              processedItems++;
              this.uploadProgress = (processedItems / totalItems) * 100;
            } catch (error) {
              console.error(`移动 ${item.key} 失败:`, error);
            }
          }

          // 移动目录标记
          const targetFolderPath = targetBasePath.slice(0, -1) + '_$folder$';
          await this.copyPaste(key, targetFolderPath);
          await axios.delete(`/api/write/items/${key}`);

          // 清除进度
          this.uploadProgress = null;
        } else {
          // 单文件移动逻辑，修复根目录的情况
          const targetFilePath = normalizedPath + finalFileName;
          await this.copyPaste(key, targetFilePath);
          await axios.delete(`/api/write/items/${key}`);
        }

        // 刷新文件列表
        this.fetchFiles();
      } catch (error) {
        console.error('移动失败:', error);
        alert('移动失败,请检查目标路径是否正确');
      }
    },

    // 新增：递归获取目录下所有文件和子目录
    async getAllItems(prefix) {
      const items = [];
      let marker = null;

      do {
        const url = new URL(`/api/children/${prefix}`, window.location.origin);
        if (marker) {
          url.searchParams.set('marker', marker);
        }

        const response = await fetch(url);
        const data = await response.json();

        // 添加文件
        items.push(...data.value);

        // 处理子目录
        for (const folder of data.folders) {
          // 添加目录标记
          items.push({
            key: folder + '_$folder$',
            size: 0,
            uploaded: new Date().toISOString(),
          });

          // 递归获取子目录内容
          const subItems = await this.getAllItems(folder);
          items.push(...subItems);
        }

        marker = data.marker;
      } while (marker);

      return items;
    },

    uploadFiles(files) {
      if (this.cwd && !this.cwd.endsWith("/")) this.cwd += "/";

      const uploadTasks = Array.from(files).map((file) => ({
        basedir: this.cwd,
        file,
      }));
      this.uploadQueue.push(...uploadTasks);
      setTimeout(() => this.processUploadQueue());
    },
  },

  watch: {
    cwd: {
      handler() {
        this.fetchFiles();
        const url = new URL(window.location);
        if ((url.searchParams.get("p") || "") !== this.cwd) {
          this.cwd
            ? url.searchParams.set("p", this.cwd)
            : url.searchParams.delete("p");
          window.history.pushState(null, "", url.toString());
        }
        document.title = this.cwd.replace(/.*\/(?!$)|\//g, "") === "/" 
            ? "FlareDrive-R2 - 优雅的 Cloudflare R2 网盘文件库"
            : `${this.cwd.replace(/.*\/(?!$)|\//g, "") || "/" } - 优雅的 Cloudflare R2 网盘文件库`;
      },
      immediate: true,
    },
  },

  created() {
    // 检查缓存的认证状态
    if (localStorage.getItem("flaredrive_auth") === "hejianwei") {
      this.isAuthenticated = true;
      // 关键：因为 watcher 可能在 created 之前就已经运行并被拦截了，所以这里必须重新加载一次文件
      this.fetchFiles();
    }

    window.addEventListener("popstate", (ev) => {
      const searchParams = new URL(window.location).searchParams;
      if (searchParams.get("p") !== this.cwd)
        this.cwd = searchParams.get("p") || "";
    });
  },

  components: {
    Dialog,
    Menu,
    MimeIcon,
    UploadPopup,
    Footer,
  },
};
</script>

<style>
/* 登录界面样式 */
.login-overlay {
  display: flex;
  height: 100vh;
  justify-content: center;
  align-items: center;
  background-size: cover;
  background-position: center;
}

.login-box {
  background: rgba(255, 255, 255, 0.9);
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 8px 16px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 300px;
  backdrop-filter: blur(10px);
}

.login-btn {
  background: #007aff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  width: 100%;
}

.login-btn:hover {
  background: #0056b3;
}

/* 全局基础样式 */
.main {
  display: flex;
  height: 100%;
  /* background-image: url(/assets/bg-light.webp); */
  background-size: cover;
  background-position: center;
  overflow-y: auto;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #333;
}

/* 顶部栏样式 */
.app-bar {
  z-index: 2;
  position: sticky;
  top: 0;
  padding: 12px 20px;
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.app-title {
  font-weight: 600;
  color: #2c3e50;
}

/* 搜索框样式优化 */
input[type="search"] {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #ddd;
  background: #f5f5f5;
  transition: all 0.2s;
  outline: none;
}
input[type="search"]:focus {
  background: white;
  border-color: #aaa;
  box-shadow: 0 0 0 2px rgba(0,0,0,0.05);
}

/* 列表容器核心样式 */
.file-list-container {
  margin: 20px auto;
  padding: 0; /* 移除内边距，让列表项填满 */
  width: 70%; /* 稍微加宽一点 */
  max-width: 1000px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05), 0 2px 5px rgba(0,0,0,0.02);
  transition: width 0.3s ease;
  overflow: hidden; /* 确保圆角内内容不溢出 */
}

.file-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column; /* 核心：竖向排列 */
}

.file-list li {
  width: 100%;
}

/* 单个文件项样式 - List View Style */
.file-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.1s;
}

.file-item:last-child {
  border-bottom: none;
}

.file-item:hover {
  background-color: rgba(255, 255, 255, 0.9);
}

.file-item:active {
  background-color: #f0f0f0;
}

/* 图标区域 */
.file-icon {
  width: 44px;
  height: 44px;
  margin-right: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* 文件信息区域 */
.file-info-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
}

.file-name {
  font-size: 15px;
  font-weight: 500;
  color: #2c3e50;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 3px;
}

.file-attr {
  font-size: 12px;
  color: #888;
  display: flex;
  align-items: center;
}

.file-separator {
  margin: 0 6px;
  opacity: 0.3;
}

/* 操作按钮 */
.action-btn {
  padding: 8px;
  margin-left: 10px;
  border-radius: 50%;
  transition: background 0.2s;
  opacity: 0.6;
}
.file-item:hover .action-btn {
  opacity: 1;
}
.action-btn:hover {
  background-color: rgba(0,0,0,0.05);
}

/* 移动端适配 */
@media (max-width: 800px) {
  .file-list-container {
    width: 92%;
  }
}

@media (max-width: 400px) {
  .menu-button {
    margin: 0;
    padding: 0;
  }
  .app-title-container {
    display: none !important;
  }
  .file-item {
    padding: 10px 12px;
  }
  .file-icon {
    width: 36px;
    height: 36px;
    margin-right: 12px;
  }
  .menu-button-text {
    display: none !important;
  }
}

/* 上传按钮样式 */
.upload-button {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #2196F3;
  color: white;
  border: none;
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 100;
  transition: transform 0.2s, background 0.2s;
}

.upload-button:hover {
  transform: scale(1.05);
  background: #1976D2;
}
.upload-button:active {
  transform: scale(0.95);
}

.menu-button {
  display: flex;
  position: relative;
  margin-left: 10px;
  padding: 0 10px;
}

.menu-button>button {
  transition: background-color 0.2s ease;
  border: none;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 20px;
}

.menu-button>button:hover {
  background-color: rgb(212, 212, 212);
}

.menu {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 10;
}
</style>
