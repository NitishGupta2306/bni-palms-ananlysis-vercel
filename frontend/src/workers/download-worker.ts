/**
 * Download Worker
 * Handles file downloads in the background without blocking the main thread
 */

interface DownloadMessage {
  type: 'start';
  url: string;
  filename: string;
  taskId: string;
}

interface ProgressMessage {
  type: 'progress';
  taskId: string;
  loaded: number;
  total: number;
  progress: number;
}

interface CompleteMessage {
  type: 'complete';
  taskId: string;
  blob: Blob;
}

interface ErrorMessage {
  type: 'error';
  taskId: string;
  error: string;
}

type WorkerMessage = ProgressMessage | CompleteMessage | ErrorMessage;

// eslint-disable-next-line no-restricted-globals
const ctx: Worker = self as any;

ctx.addEventListener('message', async (event: MessageEvent<DownloadMessage>) => {
  const { type, url, filename, taskId } = event.data;

  if (type === 'start') {
    try {
      // Fetch the file
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get total size from Content-Length header
      const contentLength = response.headers.get('Content-Length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      // Read the response body in chunks
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const chunks: Uint8Array[] = [];
      let loaded = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        chunks.push(value);
        loaded += value.length;

        // Calculate progress
        const progress = total > 0 ? Math.round((loaded / total) * 100) : 0;

        // Send progress update
        ctx.postMessage({
          type: 'progress',
          taskId,
          loaded,
          total,
          progress,
        } as ProgressMessage);
      }

      // Combine chunks into a single blob
      const blob = new Blob(chunks);

      // Send completion message
      ctx.postMessage({
        type: 'complete',
        taskId,
        blob,
      } as CompleteMessage);
    } catch (error) {
      // Send error message
      ctx.postMessage({
        type: 'error',
        taskId,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      } as ErrorMessage);
    }
  }
});

export {};
