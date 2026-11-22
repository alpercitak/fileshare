import type { FileSink } from '@/utils/save';

export const registerDownloadWorker = async (): Promise<ServiceWorkerRegistration> => {
  const registration = await navigator.serviceWorker.register('/download-sw.js', { scope: '/download-sw/' });
  const worker = registration.installing ?? registration.waiting;
  if (worker) {
    await new Promise<void>((resolve) => {
      worker.addEventListener('statechange', () => {
        if (worker.state === 'activated' || worker.state === 'redundant') {
          resolve();
        }
      });
    });
  }
  if (!registration.active) {
    throw new Error('Could not start the download worker');
  }
  return registration;
};

// Streams a file into the browser's downloads through the worker; chunks are passed on in file order.
export const openDownloadSink = async (
  registration: ServiceWorkerRegistration,
  name: string,
  size: number,
): Promise<FileSink | null> => {
  const worker = registration.active;
  if (!worker) {
    return null;
  }
  const id = crypto.randomUUID();
  const { port1, port2 } = new MessageChannel();
  let cancelled = false;
  await new Promise<void>((resolve) => {
    port1.onmessage = ({ data }) => {
      if (data === 'ready') {
        resolve();
      } else {
        cancelled = true;
      }
    };
    worker.postMessage({ id, name, size, port: port2 }, [port2]);
  });

  const iframe = document.createElement('iframe');
  iframe.hidden = true;
  iframe.src = `/download-sw/${id}`;
  document.body.append(iframe);

  const pending = new Map<number, ArrayBuffer>();
  let next = 0;
  const finish = (message: 'end' | 'abort') => {
    port1.postMessage(message);
    iframe.remove();
  };
  return {
    savedTo: 'downloads',
    write: async (position, data) => {
      if (cancelled) {
        throw new Error('Download cancelled');
      }
      pending.set(position, data);
      for (let chunk = pending.get(next); chunk; chunk = pending.get(next)) {
        pending.delete(next);
        next += chunk.byteLength;
        port1.postMessage(chunk, [chunk]);
      }
    },
    close: async () => finish('end'),
    discard: async () => finish('abort'),
  };
};
