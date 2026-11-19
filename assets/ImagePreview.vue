<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
const props = defineProps({ file: Object, index: Number, total: Number });
const emit = defineEmits(["close", "previous", "next"]);
const dialog = ref(null);
const loading = ref(true);
const failed = ref(false);
const dimensions = ref("");
const source = computed(() => `/raw/${props.file.key.split("/").map(encodeURIComponent).join("/")}`);
let previousFocus, previousOverflow;
watch(source, async () => {
  loading.value = true; failed.value = false; dimensions.value = "";
  await nextTick();
  // At either end a navigation button becomes disabled; keep keyboard focus inside the viewer.
  dialog.value?.focus();
});
function loaded(event) {
  loading.value = false;
  dimensions.value = `${event.target.naturalWidth} × ${event.target.naturalHeight}`;
}
function onKey(event) {
  if (event.key === "Escape") emit("close");
  if (event.key === "ArrowLeft") emit("previous");
  if (event.key === "ArrowRight") emit("next");
  if (event.key === "Tab") {
    const items = [...dialog.value.querySelectorAll('button:not(:disabled), a[href]')];
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.value)) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first?.focus();
    }
  }
}
onMounted(async () => {
  previousFocus = document.activeElement;
  previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  await nextTick();
  dialog.value.focus();
});
onBeforeUnmount(() => {
  document.body.style.overflow = previousOverflow;
  previousFocus?.focus();
});
</script>

<template>
  <Teleport to="body">
    <div class="image-preview-backdrop" @click.self="emit('close')">
      <section ref="dialog" class="image-preview" role="dialog" aria-modal="true" aria-label="图片预览" tabindex="-1" @keydown="onKey">
        <header class="preview-header">
          <div><strong>{{ file.key.split('/').pop() }}</strong><span>{{ index + 1 }} / {{ total }}<template v-if="dimensions"> · {{ dimensions }}</template></span></div>
          <a :href="source + '?download=1'" download class="preview-download">下载原图</a>
          <button class="preview-close" @click="emit('close')" aria-label="关闭图片预览">×</button>
        </header>
        <div class="preview-stage" @click.self="emit('close')">
          <div v-if="loading && !failed" class="preview-state" role="status"><span class="spinner"></span>正在加载原图…</div>
          <div v-if="failed" class="preview-state" role="alert"><strong>图片暂时无法预览</strong><p>可能是网络、访问权限或浏览器不支持此格式，请重试或下载原图。</p><button @click="loading = true; failed = false; dimensions = ''; $refs.image.src = source + '?retry=' + Date.now()">重新加载</button></div>
          <img :key="file.key" ref="image" :src="source" :alt="file.key.split('/').pop()" :class="{ 'preview-image-hidden': loading || failed }" @load="loaded" @error="loading = false; failed = true" />
          <button class="preview-nav preview-previous" :disabled="index <= 0" @click="emit('previous')" aria-label="上一张图片">‹</button>
          <button class="preview-nav preview-next" :disabled="index >= total - 1" @click="emit('next')" aria-label="下一张图片">›</button>
        </div>
        <footer class="preview-footer">{{ failed ? '可下载原图后查看' : '原图预览' }} · 左右方向键切换 · Esc 关闭</footer>
      </section>
    </div>
  </Teleport>
</template>
