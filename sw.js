
"use strict";

/*
 * REVISION TRACKER SERVICE WORKER
 *
 * Version 6
 *
 * Important:
 * App files use NETWORK-FIRST.
 *
 * This prevents old index.html,
 * style.css and script.js from
 * remaining permanently cached.
 */

const CACHE_NAME = "revision-tracker-v6";

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css?v=6",
  "./script.js?v=6",
  "./manifest.json",
  "./icon.png"
];


/* =========================================================
   INSTALL
   ========================================================= */

self.addEventListener(
  "install",
  event => {

    event.waitUntil(

      caches
        .open(CACHE_NAME)

        .then(cache =>
          cache.addAll(APP_FILES)
        )

        .then(() =>
          self.skipWaiting()
        )

    );

  }
);


/* =========================================================
   ACTIVATE
   ========================================================= */

self.addEventListener(
  "activate",
  event => {

    event.waitUntil(

      caches
        .keys()

        .then(keys =>

          Promise.all(

            keys
              .filter(
                key =>
                  key !==
                  CACHE_NAME
              )

              .map(
                key =>
                  caches.delete(key)
              )

          )

        )

        .then(() =>
          self.clients.claim()
        )

    );

  }
);


/* =========================================================
   FETCH
   ========================================================= */

self.addEventListener(
  "fetch",
  event => {

    if (
      event.request.method !==
      "GET"
    ) {
      return;
    }


    const url =
      new URL(
        event.request.url
      );


    /*
     * Only handle same-origin
     * requests.
     */

    if (
      url.origin !==
      self.location.origin
    ) {
      return;
    }


    /*
     * HTML / CSS / JS / manifest
     *
     * NETWORK FIRST
     *
     * Always try the newest file
     * from the server first.
     */

    const isAppFile =
      url.pathname.endsWith(
        "/"
      ) ||
      url.pathname.endsWith(
        ".html"
      ) ||
      url.pathname.endsWith(
        ".css"
      ) ||
      url.pathname.endsWith(
        ".js"
      ) ||
      url.pathname.endsWith(
        ".json"
      );


    if (isAppFile) {

      event.respondWith(

        fetch(event.request)

          .then(response => {

            if (
              response &&
              response.status === 200
            ) {

              const copy =
                response.clone();

              caches
                .open(CACHE_NAME)
                .then(cache => {

                  cache.put(
                    event.request,
                    copy
                  );

                });

            }

            return response;

          })

          .catch(() => {

            return caches.match(
              event.request
            );

          })

      );

      return;
    }


    /*
     * Images / other files:
     *
     * CACHE FIRST
     */

    event.respondWith(

      caches
        .match(event.request)

        .then(cached => {

          if (cached) {
            return cached;
          }

          return fetch(
            event.request
          )

            .then(response => {

              if (
                !response ||
                response.status !== 200
              ) {
                return response;
              }

              const copy =
                response.clone();

              caches
                .open(CACHE_NAME)
                .then(cache => {

                  cache.put(
                    event.request,
                    copy
                  );

                });

              return response;

            })

            .catch(() =>
              caches.match(
                "./index.html"
              )
            );

        })

    );

  }
);
