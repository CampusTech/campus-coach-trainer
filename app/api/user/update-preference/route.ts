import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const userData = await request.json();
        const { email, preferredName } = userData;
        console.log("userData: ", userData)
        if (!email) {
          return NextResponse.json(
            { error: 'Missing required user data' },
            { status: 400 }
          );
        }
        await sql`
            UPDATE study_buddy_users
            SET preferred_name = ${preferredName}
            WHERE email = ${email}
        `;

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Failed to update preferred name:', error)
        return NextResponse.json({ error: "Failed to update preferred name" }, { status: 500 })
    }
}