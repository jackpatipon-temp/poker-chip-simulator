import { getServerRoom, subscribeToRoom } from '@/lib/server-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ pin: string }> }
) {
  const { pin } = await params;
  const room = getServerRoom(pin);

  if (!room) {
    return new Response(JSON.stringify({ error: 'Room not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  let isCleanedUp = false;
  let unsubscribe: (() => void) | null = null;
  let heartbeatInterval: NodeJS.Timeout | null = null;
  let maxLifetimeTimeout: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const cleanup = () => {
        if (isCleanedUp) return;
        isCleanedUp = true;
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
        if (maxLifetimeTimeout) {
          clearTimeout(maxLifetimeTimeout);
          maxLifetimeTimeout = null;
        }
        if (unsubscribe) {
          try {
            unsubscribe();
          } catch {}
          unsubscribe = null;
        }
        try {
          controller.close();
        } catch {}
      };

      // 1. Send initial room state immediately
      try {
        const initialPayload = `data: ${JSON.stringify(room)}\n\n`;
        controller.enqueue(encoder.encode(initialPayload));
      } catch {
        cleanup();
        return;
      }

      // 2. Subscribe to instant room updates
      unsubscribe = subscribeToRoom(
        pin,
        (updatedRoom) => {
          if (isCleanedUp) return;
          try {
            const updatePayload = `data: ${JSON.stringify(updatedRoom)}\n\n`;
            controller.enqueue(encoder.encode(updatePayload));
          } catch {
            cleanup();
          }
        },
        () => {
          if (isCleanedUp) return;
          try {
            const deletePayload = `data: ${JSON.stringify({ deleted: true })}\n\n`;
            controller.enqueue(encoder.encode(deletePayload));
          } catch {}
          cleanup();
        }
      );

      // 3. Heartbeat ping every 20 seconds. If client disconnected, cleanup immediately!
      heartbeatInterval = setInterval(() => {
        if (isCleanedUp || request.signal.aborted) {
          cleanup();
          return;
        }
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          cleanup();
        }
      }, 20000);

      // 4. Max connection lifetime (10 minutes): gracefully close stream to release V8 memory heap
      // Client EventSource will automatically reconnect cleanly in 1s without user noticing
      maxLifetimeTimeout = setTimeout(() => {
        cleanup();
      }, 10 * 60 * 1000);

      // 5. Cleanup when request aborts
      request.signal.addEventListener('abort', () => {
        cleanup();
      });
    },
    cancel() {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (maxLifetimeTimeout) clearTimeout(maxLifetimeTimeout);
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch {}
      }
      isCleanedUp = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
