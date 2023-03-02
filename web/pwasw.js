self.addEventListener("install", (event) => 
{
    event.waitUntil(preLoad());
  });
  
  async function preLoad () 
  {
    console.log("Installing web app");
    const cache = await caches.open("offline")
    console.log("caching index and important routes");
    return cache.addAll(["/"]);
  };
  
  self.addEventListener("fetch", (event) => 
  {
    event.respondWith(checkResponse(event.request).catch(() => 
        {
          return returnFromCache(event.request);
        })
    );
    event.waitUntil(addToCache(event.request));
  });
  
  function checkResponse (request) 
  {
    return new Promise((fulfill, reject) => 
    {
      fetch(request).then((response) => 
      {
        if(response.status !== 404)
          fulfill(response);
        else 
          reject();
        
      }, reject);
    });
  };
  
  async function addToCache(request) {
    const cache = await caches.open("offline");
    const response = await fetch(request);
    console.log(response.url + " was cached");
    return cache.put(request, response);
  };
  
  async function returnFromCache(request) {
    const cache = await caches.open("offline");
    const matching = await cache.match(request);
    if(!matching || matching.status == 404)
      return cache.match("offline.html");
    else 
      return matching;
  };