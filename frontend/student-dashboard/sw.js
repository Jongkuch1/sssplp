// Service Worker for offline functionality (FR04, NFR09)
const CACHE_NAME = 'ssplp-v1.0.0';
const urlsToCache = [
    '/',
    '/index.html',
    '/login.html',
    '/register.html',
    '/student-dashboard.html',
    '/subjects.html',
    '/student-quizzes.html',
    '/student-assignments.html',
    '/tutoring.html',
    '/messaging.html',
    '/progress.html',
    '/profile.html',
    '/css/style.css',
    '/js/core/app.js',
    '/js/core/api.js',
    '/js/core/i18n.js',
    '/js/load-profile.js',
    '/js/seed-data.js',
    '/logo.svg'
];

// Install event - cache resources
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                return cache.addAll(urlsToCache);
            })
    );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            }
        )
    );
});

// Background sync for offline data
self.addEventListener('sync', function(event) {
    if (event.tag === 'background-sync') {
        event.waitUntil(syncOfflineData());
    }
});

function syncOfflineData() {
    // Sync offline quiz results, progress, etc.
    return new Promise((resolve) => {
        console.log('Syncing offline data...');
        resolve();
    });
}