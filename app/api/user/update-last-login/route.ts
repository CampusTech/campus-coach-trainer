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
        await sql`
            UPDATE coach_trainer_users
            SET last_login_at = CURRENT_TIMESTAMP
            WHERE email = ${email}
        `;

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Failed to update last login:', error)
        return NextResponse.json({ error: "Failed to update last login" }, { status: 500 })
    }
}