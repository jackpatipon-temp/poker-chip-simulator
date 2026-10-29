import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const logPath = path.join(process.cwd(), 'client_debug.log');
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${JSON.stringify(data)}\n`;
    fs.appendFileSync(logPath, line, 'utf-8');
    console.log('[CLIENT LOG]', data);
    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
