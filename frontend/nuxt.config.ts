export default defineNuxtConfig({
  compatibilityDate: '2025-07-01',
  ssr: true,
  devtools: { enabled: false },
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', '@nuxtjs/i18n'],
  css: ['~/assets/css/tailwind.css', 'leaflet/dist/leaflet.css', 'leaflet.markercluster/dist/MarkerCluster.css'],
  app: {
    head: {
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap' },
      ],
    },
  },
  runtimeConfig: {
    apiProxyTarget: 'http://localhost:3001',
    public: {
      apiBase: '',
      wsUrl: 'http://localhost:3001',
    },
  },
  i18n: {
    locales: [
      { code: 'uz', language: 'uz-UZ', name: "O'zbekcha", file: 'uz.json' },
      { code: 'ru', language: 'ru-RU', name: 'Русский', file: 'ru.json' },
    ],
    defaultLocale: 'uz',
    strategy: 'no_prefix',
    lazy: false,
    langDir: 'locales',
    bundle: { optimizeTranslationDirective: false },
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'fleet_locale',
      redirectOn: 'root',
      fallbackLocale: 'uz',
    },
  },
  build: {
    transpile: ['vue3-apexcharts'],
  },
  vite: {
    optimizeDeps: {
      include: ['leaflet', 'leaflet.markercluster', 'socket.io-client', 'dayjs'],
    },
  },
  typescript: {
    strict: true,
    typeCheck: false,
  },
});
