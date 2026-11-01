<script setup lang="ts">
import { resolveMro3dEmbedUrl } from '../utils/mro3dEmbed';

const config = useRuntimeConfig();
const { t } = useI18n();
const embedUrl = computed(() => resolveMro3dEmbedUrl(config.public.mro3dEmbedUrl, import.meta.dev));
const configured = computed(() => String(config.public.mro3dEmbedUrl ?? '').trim().length > 0);
const attempt = ref(0);
const loading = ref(false);
const slow = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;

function startLoading() {
  clearTimeout(timer);
  loading.value = Boolean(embedUrl.value);
  slow.value = false;
  if (embedUrl.value)
    timer = setTimeout(() => {
      loading.value = false;
      slow.value = true;
    }, 15000);
}

function retry() {
  startLoading();
  attempt.value += 1;
}

function onLoad() {
  // A load event can also mean a blocked/error document. Never claim viewer readiness.
  clearTimeout(timer);
  loading.value = false;
}

onMounted(startLoading);
watch(embedUrl, startLoading);
onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <section class="mro3d-page" aria-labelledby="mro3d-title">
    <header class="mro3d-header">
      <div>
        <h1 id="mro3d-title" class="text-h6">{{ t('mro3d.title') }}</h1>
        <p class="text-caption">{{ t('mro3d.demo') }}</p>
      </div>
      <div v-if="embedUrl" class="mro3d-actions">
        <VBtn variant="outlined" prepend-icon="mdi-refresh" @click="retry">
          {{ t('mro3d.retry') }}
        </VBtn>
        <VBtn
          :href="embedUrl"
          target="_blank"
          rel="noopener noreferrer"
          variant="tonal"
          prepend-icon="mdi-open-in-new"
        >
          {{ t('mro3d.open') }}
        </VBtn>
      </div>
    </header>
    <p v-if="embedUrl" class="text-caption mro3d-status" role="status" aria-live="polite">
      <VProgressCircular v-if="loading" indeterminate :size="16" :width="2" class="mr-2" />
      {{ loading ? t('mro3d.loading') : slow ? t('mro3d.slow') : t('mro3d.help') }}
    </p>
    <iframe
      v-if="embedUrl"
      :key="attempt"
      :src="embedUrl"
      :title="t('mro3d.frameTitle')"
      class="mro3d-frame"
      allow="fullscreen"
      referrerpolicy="no-referrer"
      @load="onLoad"
    />
    <VAlert v-else type="info" variant="tonal" role="status">
      {{ configured ? t('mro3d.invalid') : t('mro3d.unconfigured') }}
    </VAlert>
  </section>
</template>

<style scoped>
.mro3d-page {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: calc(100dvh - 64px);
  min-height: 0;
  padding: 12px;
  gap: 8px;
  overflow: hidden;
}
.mro3d-header,
.mro3d-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.mro3d-header {
  justify-content: space-between;
  flex-shrink: 0;
}
.mro3d-status {
  flex-shrink: 0;
}
.mro3d-frame {
  flex: 1;
  width: 100%;
  min-height: 0;
  border: 0;
  border-radius: 8px;
}
</style>
