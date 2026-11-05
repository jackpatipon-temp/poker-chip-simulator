import { NextResponse } from 'next/server';
import {
  getServerRoom,
  requestJoinServerRoom,
  approveJoinRequest,
  rejectJoinRequest,
  dispatchServerRoomAction,
  deleteServerRoom,
} from '@/lib/server-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ pin: string }> }
) {
  const { pin } = await params;
  const room = getServerRoom(pin);

  if (!room) {
    return NextResponse.json(
      { success: false, error: 'ไม่พบห้องที่ระบุ หรือห้องถูกปิดแล้ว' },
      { status: 404, headers: noCacheHeaders }
    );
  }

  return NextResponse.json({ success: true, room }, { headers: noCacheHeaders });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ pin: string }> }
) {
  const { pin } = await params;
  try {
    const body = await request.json();

    if (body.type === 'JOIN') {
      // autoApprove = false: New players require Host approval.
      // Reconnecting players are automatically recognized and seated without waiting.
      const result = requestJoinServerRoom(
        pin,
        body.playerName,
        body.playerAvatar,
        body.requestedChips,
        false,
        body.playerId
      );
      if (result.error) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400, headers: noCacheHeaders }
        );
      }
      return NextResponse.json(
        { success: true, room: result.room, request: result.request, player: result.player },
        { headers: noCacheHeaders }
      );
    }

    if (body.type === 'APPROVE') {
      const updated = approveJoinRequest(pin, body.requestId, body.chips);
      return NextResponse.json({ success: true, room: updated }, { headers: noCacheHeaders });
    }

    if (body.type === 'REJECT') {
      const updated = rejectJoinRequest(pin, body.requestId);
      return NextResponse.json({ success: true, room: updated }, { headers: noCacheHeaders });
    }

    // Game action dispatch
    const updated = dispatchServerRoomAction(pin, body);
    if (!updated) {
      const roomStillExists = getServerRoom(pin);
      if (!roomStillExists) {
        return NextResponse.json(
          { success: false, error: 'Room was closed', room: null },
          { status: 404, headers: noCacheHeaders }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Action could not be executed', room: roomStillExists },
        { status: 400, headers: noCacheHeaders }
      );
    }
    return NextResponse.json({ success: true, room: updated }, { headers: noCacheHeaders });
  } catch (error) {
    console.error(`[API /api/rooms/${pin}] POST error:`, error);
    const room = getServerRoom(pin);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error)?.message || 'Action failed',
        room,
      },
      { status: 500, headers: noCacheHeaders }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ pin: string }> }
) {
  const { pin } = await params;
  const deleted = deleteServerRoom(pin);
  return NextResponse.json({ success: deleted, deleted: true }, { headers: noCacheHeaders });
}
