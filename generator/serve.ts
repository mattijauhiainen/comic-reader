Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    let filepath = `./reader${url.pathname}`;

    // Default to index.html for directory requests
    if (url.pathname === "/" || url.pathname.endsWith("/")) {
      filepath = `./reader${url.pathname}index.html`;
    }

    console.log(`${req.method} ${url.pathname} -> ${filepath}`);

    const file = Bun.file(filepath);

    return new Response(file, {
      headers: {
        "Content-Type": getContentType(filepath),
      },
    });
  },
});

function getContentType(filepath: string): string {
  const ext = filepath.split(".").pop()?.toLowerCase();
  const types: Record<string, string> = {
    html: "text/html",
    css: "text/css",
    js: "application/javascript",
    json: "application/json",
    avif: "image/avif",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
  };
  return types[ext || ""] || "text/plain";
}

console.log("Server running at http://localhost:3000");
console.log("Press Ctrl+C to stop");
