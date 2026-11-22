// Turns chunks posted by the page into a streamed browser download, so receivers without the
// File System Access API don't hold whole files in memory. Registered with scope /download-sw/.
const downloads = new Map();

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('message', (event) => {
  const { id, name, size, port } = event.data;
  const stream = new ReadableStream({
    start(controller) {
      port.onmessage = ({ data }) => {
        if (data === 'end') {
          controller.close();
        } else if (data === 'abort') {
          controller.error(new Error('Transfer failed'));
        } else {
          controller.enqueue(new Uint8Array(data));
        }
      };
    },
    cancel() {
      port.postMessage('cancel'); // the user cancelled the download
    },
  });
  downloads.set(id, { stream, name, size });
  port.postMessage('ready');
});

self.addEventListener('fetch', (event) => {
  const id = new URL(event.request.url).pathname.split('/')[2];
  const download = downloads.get(id);
  if (!download) {
    return;
  }
  downloads.delete(id);
  event.respondWith(
    new Response(download.stream, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(download.size),
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(download.name)}`,
      },
    }),
  );
});
