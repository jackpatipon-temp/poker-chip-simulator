import { NextResponse } from 'next/server';
import { createServerRoom, generateRoomPin, getServerRoom } from '@/lib/server-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { hostName, hostAvatar, startingChips, smallBlind, bigBlind, customPin, raiseRule } = body;

    const pin = customPin ? customPin.toString().trim() : generateRoomPin();
    const room = createServerRoom(
      pin,
      hostName || 'Host Admin',
      hostAvatar,
      startingChips || 1000,
      smallBlind || 5,
      bigBlind || 10,
      raiseRule || 'standard'
    );

    return NextResponse.json({ success: true, pin, room });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create room' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pin = searchParams.get('pin');

  if (!pin) {
    return NextResponse.json({ success: false, error: 'PIN is required' }, { status: 400 });
  }

  const room = getServerRoom(pin);
  if (!room) {
    return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, room });
}
