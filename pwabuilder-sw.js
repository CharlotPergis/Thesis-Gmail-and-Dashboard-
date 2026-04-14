// This is the "Offline page" service worker
const CACHE = "pwabuilder-offline";
const offlineFallbackPage = "offline.html";

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.add(offlineFallbackPage);
    })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.open(CACHE).then((cache) => {
          return cache.match(offlineFallbackPage);
        });
      })
    );
  }
});