import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    const systemMessage = {
      role: "system",
      content: "You are a helpful AI tutor. Provide clear, concise explanations and guide students through their learning process. If a concept is complex, break it down into simpler parts. Feel free to ask clarifying questions when needed."
    };
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [systemMessage, ...messages],
      temperature: 0.7,
    });

    return NextResponse.json(response.choices[0].message);
  } catch (error) {
    return NextResponse.json({ error: 'Error processing request' }, { status: 500 });
  }
} 