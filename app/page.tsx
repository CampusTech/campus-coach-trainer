'use client';

import { useState, useEffect, useRef } from 'react';
import { auth } from "./auth"
import Chat from './components/Chat'
import Link from 'next/link'
import Image from 'next/image'
import SignInButton from './components/SignInButton'
import { createRealtimeConnection } from './lib/realtimeConnection';
import { fetchEphemeralKey } from './lib/fetchEphemeralKey';
import { Session, SessionStatus } from "@/app/types";

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("DISCONNECTED");
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const authenticate = async () => {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        // Include any necessary headers or body data
      });

      if (response.ok) {
        console.log('Authenticated successfully');
      } else {
        console.error('Failed to authenticate');
      }
    };

    authenticate();
  }, []);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch('/api/clientsession');
        if (response.ok) {
          const session = await response.json();
          setSession(session);
        } else {
          console.error('Failed to fetch session');
        }
      } catch (error) {
        console.error('Error fetching session:', error);
      }
    };

    fetchSession();
  }, []);

  const startRoleplay = async () => {
    if (sessionStatus !== "DISCONNECTED") return;
    setSessionStatus("CONNECTING");

    try {
      const EPHEMERAL_KEY = await fetchEphemeralKey();
      if (!EPHEMERAL_KEY) {
        return;
      }

      if (!audioElementRef.current) {
        audioElementRef.current = document.createElement("audio");
      }
      audioElementRef.current.autoplay = true;

      const { pc, dc } = await createRealtimeConnection(
        EPHEMERAL_KEY,
        audioElementRef
      );

      dc.addEventListener("open", () => {
        dc.send(JSON.stringify({
          type: "start",
          prompt: "You are playing the part of a student who is having trouble with their algebra homework."
        }));
      });

      setSessionStatus("CONNECTED");
    } catch (err) {
      console.error("Error connecting to realtime:", err);
      setSessionStatus("DISCONNECTED");
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen p-8">
        <main className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center justify-center gap-4">
            <h1 className="text-2xl font-bold">Welcome to Campus Coach Trainer</h1>
            <SignInButton />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <main className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Chat with your Coach Trainer</h1>
          {session?.user && (
            <div className="flex items-center gap-2">
              <Image
                src={session.user.image ?? ''}
                alt="Profile"
                width={32}
                height={32}
                className="rounded-full"
              />
              <span>{session.user.name}</span>
              <Link
                href="/api/auth/signout"
                className="text-sm text-red-500 hover:underline"
              >
                Sign out
              </Link>
            </div>
          )}
        </div>
        <button onClick={startRoleplay} className="btn btn-primary">
          Start roleplay
        </button>
        <Chat email={session?.user?.email ?? ''} googleName={session?.user?.name ?? ''} />
      </main>
    </div>
  )
}
