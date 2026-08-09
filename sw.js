/* دفتر حساب — service worker ساده برای کارکرد آفلاین.
   نکته: چون همه‌چیز (کد و استایل) داخل خودِ index.html است، فقط همان
   فایل + آیکون‌ها را کش می‌کنیم. هر بار که index.html را روی گیت‌هاب
   آپدیت کردید، عدد نسخه‌ی CACHE_NAME را پایین‌تر عوض کنید تا کاربرها
   نسخه‌ی جدید را بگیرند (وگرنه ممکن است نسخه‌ی کش‌شده‌ی قدیمی برایشان
   بماند). */
const CACHE_NAME = 'hesabdari-cache-v7';
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

/* network-first for navigation/index.html so users get the latest version
   when online, falling back to the cached copy when offline; cache-first
   for static assets (icons, manifest). */
self.addEventListener('fetch', function(event){
  var req = event.request;
  if(req.method !== 'GET') return;

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
