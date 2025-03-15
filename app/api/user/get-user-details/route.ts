import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const userData = await request.json();
        const { email } = userData;
        if (!email) {
          return NextResponse.json(
            { error: 'Missing required user data' },
            { status: 400 }
          );
        }
        const result = await sql`
            SELECT preferred_name, last_chat_at FROM study_buddy_users
            WHERE email = ${email}
        `;
        console.log("result: ", result)
        return NextResponse.json({ preferredName: result.rows[0].preferred_name, lastChatAt: result.rows[0].last_chat_at })
    } catch (error) {
        console.error('Failed to update preferred name:', error)
        return NextResponse.json({ error: "Failed to update preferred name" }, { status: 500 })
    }
}