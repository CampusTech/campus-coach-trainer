import { auth } from "./auth"
import Chat from './components/Chat'
import Link from 'next/link'
import Image from 'next/image'
import SignInButton from './components/SignInButton'
import { EventProvider } from "./contexts/EventContext"
import { TranscriptProvider } from "./contexts/TranscriptContext"

export default async function Home() {
  const session = await auth()

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
          <h1 className="text-2xl font-bold"></h1>
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
        <TranscriptProvider>
          <EventProvider>
            {/* <Chat firstName={session?.user?.name?.split(' ')[0] ?? 'Coach'} /> */}
            <Chat />
            {/* <Chat firstName="Mary" /> */}
          </EventProvider>
        </TranscriptProvider>
      </main>
    </div>
  )
}
