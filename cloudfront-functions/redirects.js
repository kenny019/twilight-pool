function handler(event) {
  var request = event.request;
  var uri = request.uri;
  
  var redirects = {
  "/design/components": {
    "location": "/design",
    "permanent": true
  },
  "/design/core": {
    "location": "/design",
    "permanent": true
  },
  "/btc-deposit-flow": {
    "location": "/guides/btc-deposit-flow.html",
    "permanent": false
  },
  "/dex-operations": {
    "location": "/guides/dex-operations.html",
    "permanent": false
  },
  "/lend-to-twilight-pool": {
    "location": "/guides/lend-to-twilight-pool.html",
    "permanent": false
  }
};
  
  if (redirects[uri]) {
    var redirect = redirects[uri];
    return {
      statusCode: redirect.permanent ? 301 : 302,
      statusDescription: redirect.permanent ? 'Moved Permanently' : 'Found',
      headers: {
        'location': { value: redirect.location }
      }
    };
  }
   // Append .html extension if URI doesn't have an extension and isn't a directory
  // This handles Next.js static export pages like /test-mint-burn -> /test-mint-burn.html
  if (!uri.includes('.') && !uri.endsWith('/')) {
    request.uri = uri + '.html';
  }
  return request;
}