import { getServerRoom, subscribeToRoom } from '@/lib/server-store';

export const dynamic = 'force-dynamic';

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

  const stream = new ReadableStream({
    start(controller) {
      // Send initial room state immediately
      const initialPayload = `data: ${JSON.stringify(room)}\n\n`;
      controller.enqueue(encoder.encode(initialPayload));

      // Subscribe to instant broadcast events
      const unsubscribe = subscribeToRoom(pin, (updatedRoom) => {
        try {
          const updatePayload = `data: ${JSON.stringify(updatedRoom)}\n\n`;
          controller.enqueue(encoder.encode(updatePayload));
        } catch {
          // Stream closed
        }
      });

      // Heartbeat ping every 15 seconds to keep LAN connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 15000);

      // Cleanup when browser closes or navigates away
      request.signal.addEventListener('abort', () => {
        unsubscribe();
        clearInterval(heartbeatInterval);
        try {
          controller.close();
        } catch {}
      });
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
