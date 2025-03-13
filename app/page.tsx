'use client'

import Chat from './components/Chat'
import Link from 'next/link'
import Image from 'next/image'
import { useSession } from "next-auth/react"
import SignInButton from './components/SignInButton'

export default function Home() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div>Loading...</div>
  }

  if (!session) {
    return (
      <div className="min-h-screen p-8">
        <main className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center justify-center gap-4">
            <h1 className="text-2xl font-bold">Welcome to Campus Study Buddy</h1>
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
          <h1 className="text-2xl font-bold">AI Tutor Chat</h1>
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
        <Chat />
      </main>
    </div>
  )
}
