/* MARO Smart Sign Glove - offline application shell */
const CACHE_PREFIX = "maro-smart-sign-glove";
const CACHE_VERSION = "v4.0.0";
const CACHE_NAME = `${CACHE_PREFIX}-${CACHE_VERSION}`;
const APP_SHELL = [
  "./.nojekyll",
  "./LICENSE",
  "./README.md",
  "./assets/css/pwa.css",
  "./assets/css/style.css",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-maskable-512.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/favicon-32.png",
  "./assets/images/glove-prototype.png",
  "./assets/images/glove-wiring.jpg",
  "./assets/images/sensor-layout.png",
  "./assets/images/separator.svg",
  "./assets/images/student-leader.png",
  "./assets/js/app.js",
  "./assets/js/camera.js",
  "./assets/js/pwa.js",
  "./assets/js/quiz.js",
  "./diagrams/مخطط_آلية_العمل.svg",
  "./diagrams/مخطط_التوصيل.svg",
  "./docs/00_المعاينة_البصرية.html",
  "./docs/01_دليل_التنفيذ.md",
  "./docs/02_إعداد_بيئة_البرمجة.md",
  "./docs/03_الذكاء_الاصطناعي_وخطة_التطوير.md",
  "./docs/04_سجل_الاختبار_والصيانة.md",
  "./docs/05_هيكل_المشروع.md",
  "./docs/06_دليل_التشغيل_دون_إنترنت.md",
  "./firmware/MARO_Smart_Sign_Glove.ino",
  "./hardware/جدول_التوصيلات.md",
  "./hardware/قائمة_المكونات.md",
  "./index.html",
  "./manifest.webmanifest",
  "./media/رسم_توزيع_الحساسات.png",
  "./media/صورة_الطالب_قائد_المشروع.png",
  "./media/نموذج_القفاز_المركب.png",
  "./media/نموذج_القفاز_الموصلات_الفعلي.png"
];
const OFFLINE_PAGE = "./offline.html";

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([...APP_SHELL, OFFLINE_PAGE]);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
        return response;
      } catch (_) {
        return (await caches.match(request)) || (await caches.match("./index.html")) || (await caches.match(OFFLINE_PAGE));
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
    } catch (_) {
      return new Response("Offline - resource unavailable", { status: 503, statusText: "Offline" });
    }
  })());
});
