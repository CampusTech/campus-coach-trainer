import Chat from './components/Chat';

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-8">AI Tutor Chat</h1>
        <Chat />
      </main>
    </div>
  );
}
