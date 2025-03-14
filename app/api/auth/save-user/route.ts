import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const userData = await request.json();
    const { name, email, image } = userData;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Missing required user data' },
        { status: 400 }
      );
    }

    await sql`
      INSERT INTO study_buddy_users (name, email, profile_image)
      VALUES (${name}, ${email}, ${image})
    `;

    return NextResponse.json({ message: 'User saved successfully' });

  } catch (error) {
    console.error('Error saving user:', error);
    return NextResponse.json(
      { error: 'Failed to save user' },
      { status: 500 }
    );
  }
}