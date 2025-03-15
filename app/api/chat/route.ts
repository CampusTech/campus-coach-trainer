import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req: Request) {
  try {
    const { messages, email, name } = await req.json();

    const systemMessage = {
      role: "system",
      content: `You are a helpful AI tutor. Student's name is ${name}. Provide clear, concise explanations and guide students through their learning process. If a concept is complex, break it down into simpler parts. Feel free to ask clarifying questions when needed.`
    };

    await fetch(`${process.env.NEXT_PUBLIC_URL}/api/user/update-last-chat-at`, {
      method: 'POST',
      body: JSON.stringify({ email })
    })

    // Define the function tool for updating user preferences
    const updatePreferenceTool = {
      type: 'function' as const,
      function: {
        name: 'saveUserPreference',
        description: 'Stores the user\'s preferred name',
        parameters: {
          type: 'object',
          properties: {
            preferredName: {
              type: 'string',
              description: 'The user\'s preferred name'
            }
          },
          required: ['preferredName']
        }
      }
    };

    const initialMessages = [systemMessage, ...messages];
    // console.log('Initial messages sent to OpenAI:', JSON.stringify(initialMessages, null, 2));

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: initialMessages,
      temperature: 0.7,
      tools: [updatePreferenceTool],
      tool_choice: 'auto',
    });

    // console.log("OpenAI response: ", JSON.stringify(response.choices[0].message, null, 2));
    const responseMessage = response.choices[0].message;

    if (responseMessage.tool_calls) {
      // console.log("Tool calls detected: ", JSON.stringify(responseMessage.tool_calls, null, 2));
      for (const toolCall of responseMessage.tool_calls) {
        if (toolCall.function.name === 'saveUserPreference') {
          const args = JSON.parse(toolCall.function.arguments);
          // Call the update preference API route
          const result = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/user/update-preference`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              preferredName: args.preferredName
            })
          });

          // Add the function response to messages
          const functionResponse = {
            tool_call_id: toolCall.id,
            role: 'tool' as const,
            name: toolCall.function.name,
            content: JSON.stringify({ success: result.ok })
          };

          // Make another API call with the function result
          const secondMessages = [...messages, responseMessage, functionResponse];
          // console.log('Second messages sent to OpenAI:', JSON.stringify(secondMessages, null, 2));

          const secondResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: secondMessages,
            temperature: 0.7,
            tools: [updatePreferenceTool],
            tool_choice: 'auto',
          });

          // console.log("Second OpenAI response: ", JSON.stringify(secondResponse.choices[0].message, null, 2));
          return NextResponse.json(secondResponse.choices[0].message);
        }
      }
    }

    return NextResponse.json(responseMessage);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to communicate with AI';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}