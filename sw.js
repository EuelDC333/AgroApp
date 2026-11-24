const CACHE_NAME = 'agrocampo-pwa-v1';

// Archivos locales de tu repositorio en GitHub Pages
const LOCAL_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// Librerías externas que usa AGROCAMPO para quedar 100% utilizable sin señal
const EXTERNAL_ASSETS = [
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.ttf',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap'
];

// Instalación: descarga y congela la app y sus librerías en la memoria del teléfono
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            await cache.addAll(LOCAL_ASSETS);
            await Promise.allSettled(
                EXTERNAL_ASSETS.map(async (url) => {
                    try {
                        const res = await fetch(url, { mode: 'cors' });
                        if (res && (res.ok || res.type === 'opaque')) {
                            await cache.put(url, res);
                            return;
                        }
                    } catch (_) {}
                    try {
                        const opaqueRes = await fetch(url, { mode: 'no-cors' });
                        if (opaqueRes) await cache.put(url, opaqueRes);
                    } catch (_) {}
                })
            );
        }).then(() => self.skipWaiting())
    );
});

// Activación: limpia versiones viejas de caché y toma control inmediato
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// Intercepción de red: funciona rápido en zonas rurales y 100% offline
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    // 1. Navegación (abrir la app): Stale-While-Revalidate con respaldo a ./index.html
    if (req.mode === 'navigate') {
        event.respondWith(
            caches.open(CACHE_NAME).then(async (cache) => {
                const cached = (await cache.match(req)) || (await cache.match('./index.html'));
                const networkPromise = fetch(req)
                    .then((res) => {
                        if (res && res.ok) {
                            cache.put(req, res.clone());
                            cache.put('./index.html', res.clone());
                        }
                        return res;
                    })
                    .catch(() => null);

                return cached || (await networkPromise) || (await cache.match('./index.html'));
            })
        );
        return;
    }

    // 2. Recursos (CSS, JS, fuentes, íconos): Cache-First con guardado dinámico
    event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
            const cached = await cache.match(req, { ignoreSearch: false });
            if (cached) return cached;

            try {
                const res = await fetch(req);
                if (res && (res.ok || res.type === 'opaque')) {
                    cache.put(req, res.clone());
                }
                return res;
            } catch (_) {
                return cached || new Response('', { status: 503, statusText: 'Offline' });
            }
        })
    );
});
