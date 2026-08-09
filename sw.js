/* دفتر حساب — service worker.
   نکته: چون همه‌چیز (کد و استایل) داخل خودِ index.html است، فقط همان
   فایل + آیکون‌ها را کش می‌کنیم. هر بار که index.html را روی گیت‌هاب
   آپدیت کردید، عدد نسخه‌ی CACHE_NAME را پایین‌تر عوض کنید تا کاربرها
   نسخه‌ی جدید را بگیرند (وگرنه ممکن است نسخه‌ی کش‌شده‌ی قدیمی برایشان
   بماند).

   این فایل همچنین مسیر مجازی «/ics-event.ics» را با پاسخ واقعی شبکه‌ای
   (Response با هدر Content-Type: text/calendar) پاسخ می‌دهد. چون این
   اپ کاملاً سمت کاربر است و سروری در کار نیست، این تنها راه قابل‌اعتماد
   برای این‌که سافاری آیفون رویداد را با هدر درست ببیند و صفحه‌ی بومی
   «Add to Calendar» را نشان بدهد، بدون اینکه navigator.share یا data:
   URI درگیر شود — که هر دو رفتار غیرقابل‌پیش‌بینی داشتند. */
const CACHE_NAME = 'hesabdari-cache-v3';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function(event){
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(APP_SHELL);
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME; })
            .map(function(k){ return caches.delete(k); })
      );
    }).then(function(){ return self.clients.claim(); })
  );
});

function icsEventResponse(url){
  var text = url.searchParams.get('d') || '';
  return new Response(text, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="event.ics"',
      'Cache-Control': 'no-store'
    }
  });
}

/* network-first for navigation/index.html so users get the latest version
   when online, falling back to the cached copy when offline; cache-first
   for static assets (icons, manifest); the /ics-event.ics route is handled
   entirely inside the worker, before any of that. */
self.addEventListener('fetch', function(event){
  var req = event.request;
  if(req.method !== 'GET') return;

  var url = new URL(req.url);
  if(url.pathname.indexOf('/ics-event.ics') !== -1){
    event.respondWith(icsEventResponse(url));
    return;
  }

  if(req.mode === 'navigate'){
    event.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put('./index.html', copy); });
        return res;
      }).catch(function(){
        return caches.match('./index.html');
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(function(cached){
      return cached || fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
        return res;
      }).catch(function(){ return cached; });
    })
  );
});
