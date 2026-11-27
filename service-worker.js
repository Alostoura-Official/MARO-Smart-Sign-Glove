const CACHE_PREFIX = "maro-smart-sign-glove";
const CACHE_VERSION = "MARO-V1.0.8"; 

const SHELL_CACHE = `${CACHE_PREFIX}-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-${CACHE_VERSION}`;

/* =========================================================
   Application Files
   ========================================================= */

const APP_SHELL = [
  // Main pages
  "./",
  "./index.html",
  "./offline.html",
  "./manifest.webmanifest",

  // CSS
  "./assets/css/style.css",
  "./assets/css/pwa.css",

  // JavaScript
  "./assets/js/app.js",
  "./assets/js/camera.js",
  "./assets/js/pwa.js",
  "./assets/js/quiz.js",

  // Icons
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/favicon-32.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-maskable-512.png",
  "./assets/icons/MARO-Smart.png",

  // Images
  "./assets/images/glove-prototype.png",
  "./assets/images/glove-wiring.jpg",
  "./assets/images/sensor-layout.png",
  "./assets/images/separator.svg",
  "./assets/images/student-leader.png",

  // Diagrams
  "./diagrams/مخطط_التوصيل.svg",
  "./diagrams/مخطط_آلية_العمل.svg",

  // Documentation
  "./docs/00_المعاينة_البصرية.html",
  "./docs/محاكي-إيماءات-اليد.html",
  "./docs/01_دليل_التنفيذ.md",
  "./docs/02_إعداد_بيئة_البرمجة.md",
  "./docs/03_الذكاء_الاصطناعي_وخطة_التطوير.md",
  "./docs/04_سجل_الاختبار_والصيانة.md",
  "./docs/05_هيكل_المشروع.md",
  "./docs/06_دليل_التشغيل_دون_إنترنت.md",

  // Firmware
  "./firmware/MARO_Smart_Sign_Glove.ino",

  // Hardware
  "./hardware/جدول_التوصيلات.md",
  "./hardware/قائمة_المكونات.md",

  // Media
  "./media/رسم_توزيع_الحساسات.png",
  "./media/صورة_الطالب_قائد_المشروع.png",
  "./media/نموذج_القفاز_المركب.png",
  "./media/نموذج_القفاز_الموصلات_الفعلي.png",

  // Project information
  "./README.md",
  "./LICENSE"
];

/* =========================================================
   Helpers
   ========================================================= */

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isAllowedExternal(url) {
  return (
    url.hostname.includes("mediapipe") ||
    url.hostname.includes("cdn.jsdelivr.net") ||
    url.hostname.includes("storage.googleapis.com") ||
    url.hostname.includes("tfhub.dev")
  );
}

function isHtmlRequest(request) {
  return (
    request.mode === "navigate" ||
    request.headers.get("accept")?.includes("text/html")
  );
}

function isStaticAsset(url) {
  return /\.(css|js|mjs|json|webmanifest|wasm)$/i.test(
    url.pathname
  );
}

function isImageOrFont(url) {
  return /\.(png|jpg|jpeg|webp|svg|gif|ico|woff2?|ttf|otf|wasm|tflite|data|binarypb|pak)$/i.test(
    url.pathname
  );
}

async function saveResponse(cache, request, response) {
  if (!response) return;
  if (!response.ok && response.type !== "opaque") return;

  try {
    await cache.put(request, response.clone());
  } catch (err) {
    console.warn("[MARO SW] Failed to cache:", request.url, err);
  }
}

/* =========================================================
   INSTALL
   Cache application shell
   ========================================================= */

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);

      const results = await Promise.allSettled(
        APP_SHELL.map(async (path) => {
          const url = new URL(
            path,
            self.registration.scope
          );

          if (!isSameOrigin(url)) return;

          const response = await fetch(url.href, {
            cache: "reload"
          });

          if (!response.ok) {
            throw new Error(
              `Failed: ${path} (${response.status})`
            );
          }

          await cache.put(url.href, response);
        })
      );

      const failed = results.filter(
        (result) => result.status === "rejected"
      );

      console.log(
        `[MARO SW] Cached ${APP_SHELL.length - failed.length}/${APP_SHELL.length} files`
      );

      if (failed.length) {
        console.warn(
          "[MARO SW] Files not cached:",
          failed
        );
      }

      await self.skipWaiting();
    })()
  );
});

/* =========================================================
   ACTIVATE
   Remove old caches
   ========================================================= */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith(`${CACHE_PREFIX}-`) &&
              key !== SHELL_CACHE &&
              key !== RUNTIME_CACHE
          )
          .map((key) => caches.delete(key))
      );

      await self.clients.claim();

      console.log(
        `[MARO SW] Active ${CACHE_VERSION}`
      );
    })()
  );
});

/* =========================================================
   NETWORK FIRST
   HTML Pages
   ========================================================= */

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    const response = await fetch(request);
    if (response.ok) {
      await saveResponse(cache, request, response);
    }
    return response;
  } catch (error) {
    // 1. لو الصفحة موجودة في الكاش
    const cached = await caches.match(request);
    if (cached) return cached;

    // 2. لو مفيش، نجيب صفحة الأوفلاين
    const offlineUrl = new URL("offline.html", self.registration.scope);
    const cachedOffline = await caches.match(offlineUrl.href);
    if (cachedOffline) return cachedOffline;

    // 3. لو صفحة الأوفلاين نفسها مش موجودة، نجيب الـ index
    const indexUrl = new URL("index.html", self.registration.scope);
    const cachedIndex = await caches.match(indexUrl.href);
    if (cachedIndex) return cachedIndex;

    // 4. لو مفيش أي حاجة خالص، نرجع نص عادي
    return new Response("أنت غير متصل بالإنترنت", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
}

/* =========================================================
   STALE WHILE REVALIDATE
   CSS / JavaScript / JSON / WASM
   ========================================================= */

async function staleWhileRevalidate(request, event) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await caches.match(request);

  const update = fetch(request)
    .then(async (response) => {
      await saveResponse(cache, request, response);
      return response;
    })
    .catch(() => null);

  event.waitUntil(update);

  if (cached) return cached;

  const response = await update;

  return response || new Response(
    "Resource unavailable offline",
    {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8"
      }
    }
  );
}

/* =========================================================
   CACHE FIRST
   Images / Fonts / Icons / Camera Models
   ========================================================= */

async function cacheFirst(request) {
  const cached = await caches.match(request);

  if (cached) return cached;

  const cache = await caches.open(RUNTIME_CACHE);

  try {
    const response = await fetch(request);

    await saveResponse(cache, request, response);

    return response;

  } catch (error) {
    return new Response("", {
      status: 503,
      statusText: "Resource unavailable offline"
    });
  }
}

/* =========================================================
   FETCH HANDLER
   ========================================================= */

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (!isSameOrigin(url) && !isAllowedExternal(url)) return;

  // HTML
  if (isHtmlRequest(request)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isAllowedExternal(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // CSS / JavaScript / JSON / WASM
  if (isStaticAsset(url)) {
    event.respondWith(
      staleWhileRevalidate(request, event)
    );
    return;
  }

  // Images / Fonts / Icons / Camera Models
  if (isImageOrFont(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }
});

/* =========================================================
   MESSAGE HANDLER
   ========================================================= */

self.addEventListener("message", (event) => {
  if (!event.data) return;

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

console.log("[MARO SW] Service Worker loaded");
