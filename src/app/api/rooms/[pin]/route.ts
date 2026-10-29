import { NextResponse } from 'next/server';
import {
  getServerRoom,
  requestJoinServerRoom,
  approveJoinRequest,
  rejectJoinRequest,
  dispatchServerRoomAction,
} from '@/lib/server-store';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ pin: string }> }
) {
  const { pin } = await params;
  const room = getServerRoom(pin);

  if (!room) {
    return NextResponse.json({ success: false, error: 'ไม่พบห้องที่ระบุ' }, { status: 404 });
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
    return NextResponse.json({ success: true, room: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Action failed' }, { status: 500 });
  }
}
