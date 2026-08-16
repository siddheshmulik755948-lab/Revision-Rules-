"use strict";

const CACHE_NAME =
  "revision-tracker-v1";

const FILES_TO_CACHE = [

  "./",

  "./index.html",

  "./style.css",

  "./script.js",

  "./manifest.json",

  "./icon.png"

];


self.addEventListener(
  "install",
  (event) => {

    event.waitUntil(

      caches
        .open(
          CACHE_NAME
        )
        .then(
          (cache) =>
            cache.addAll(
              FILES_TO_CACHE
            )
        )
        .then(
          () =>
            self.skipWaiting()
        )

    );

  }
);


self.addEventListener(
  "activate",
  (event) => {

    event.waitUntil(

      caches
        .keys()
        .then(
          (cacheNames) =>

            Promise.all(

              cacheNames
                .filter(
                  (name) =>
                    name !==
                    CACHE_NAME
                )
                .map(
                  (name) =>
                    caches.delete(
                      name
                    )
                )

            )

        )
        .then(
          () =>
            self.clients.claim()
        )

    );

  }
);


self.addEventListener(
  "fetch",
  (event) => {

    if (
      event.request.method !==
      "GET"
    ) {

      return;

    }


    event.respondWith(

      caches
        .match(
          event.request
        )
        .then(
          (cachedResponse) => {

            if (
              cachedResponse
            ) {

              return cachedResponse;

            }


            return fetch(
              event.request
            )
              .then(
                (response) => {

                  if (
                    response &&
                    response.ok
                  ) {

                    const copy =
                      response.clone();


                    caches
                      .open(
                        CACHE_NAME
                      )
                      .then(
                        (cache) =>
                          cache.put(
                            event.request,
                            copy
                          )
                      );

                  }


                  return response;

                }
              )
              .catch(
                () =>
                  caches.match(
                    "./index.html"
                  )
              );

          }
        )

    );

  }
);
