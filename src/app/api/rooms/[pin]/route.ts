import { NextResponse } from 'next/server';
import {
  getServerRoom,
  requestJoinServerRoom,
  approveJoinRequest,
  rejectJoinRequest,
  dispatchServerRoomAction,
  deleteServerRoom,
} from '@/lib/server-store';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ pin: string }> }
) {
  const { pin } = await params;
  const room = getServerRoom(pin);

  if (!room) {
    return NextResponse.json({ success: false, error: 'ไม่พบห้องที่ระบุ หรือห้องถูกปิดแล้วเนื่องจากไม่มีผู้เล่น' }, { status: 404 });
  }

  return NextResponse.json({ success: true, room });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ pin: string }> }
) {
  try {
    const { pin } = await params;
    const body = await request.json();

    if (body.type === 'JOIN') {
      const result = requestJoinServerRoom(pin, body.playerName, body.playerAvatar, body.requestedChips);
      if (result.error) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, room: result.room, request: result.request, player: result.player });
    }

    if (body.type === 'APPROVE') {
      const updated = approveJoinRequest(pin, body.requestId, body.chips);
      return NextResponse.json({ success: true, room: updated });
    }

    if (body.type === 'REJECT') {
      const updated = rejectJoinRequest(pin, body.requestId);
      return NextResponse.json({ success: true, room: updated });
    }

    // Game action dispatch
    const updated = dispatchServerRoomAction(pin, body);
    if (!updated) {
      // Room was permanently deleted because 0 players remain
      return NextResponse.json({ success: true, room: null, deleted: true });
    }
    return NextResponse.json({ success: true, room: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Action failed' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ pin: string }> }
) {
  const { pin } = await params;
  const deleted = deleteServerRoom(pin);
  return NextResponse.json({ success: deleted, deleted: true });
}
