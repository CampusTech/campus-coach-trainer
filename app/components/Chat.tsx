'use client';

import { useState, useRef, useEffect } from 'react';
import { createRealtimeConnection } from '../lib/realtimeConnection';
import { fetchEphemeralKey } from '../lib/fetchEphemeralKey';
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatProps {
  email: string;
  googleName: string;
}

export default function Chat({ email, googleName }: ChatProps) {
  const firstName = googleName.split(' ')[0];
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);

  useEffect(() => {
    const setupConnection = async () => {
      const EPHEMERAL_KEY = await fetchEphemeralKey();
      if (!EPHEMERAL_KEY) {
        return;
      }

      const { pc, dc } = await createRealtimeConnection(EPHEMERAL_KEY, audioElementRef);
      setDataChannel(dc);

      dc.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'audio') {
          playAudioResponse(message.audioUrl);
        } else {
          setMessages((prevMessages) => [...prevMessages, message]);
        }
      });
    };

    setupConnection();
  }, []);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) {
      console.error('Web Speech API is not supported in this browser.');
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      handleVoiceInput(transcript);
    };

    recognition.onerror = (event: ErrorEvent) => {
      console.error('Speech recognition error:', event.error);
    };

    recognitionRef.current = recognition;
  }, []);

  const handleVoiceInput = (transcript: string) => {
    if (dataChannel && dataChannel.readyState === 'open') {
      dataChannel.send(JSON.stringify({ type: 'text', content: transcript }));
      setMessages([...messages, { role: 'user', content: transcript }]);
    }
  };

  const startRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const playAudioResponse = (audioUrl: string) => {
    if (!audioElementRef.current) {
      audioElementRef.current = new Audio();
    }
    audioElementRef.current.src = audioUrl;
    audioElementRef.current.play().catch((err) => {
      console.warn('Audio playback failed:', err);
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="h-[500px] overflow-y-auto border rounded-lg p-4 mb-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`mb-4 ${
              message.role === 'user' ? 'text-right' : 'text-left'
            }`}
          >
            <div
              className={`inline-block p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-black'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          className={`px-4 py-2 rounded ${
            isRecording ? 'bg-red-500' : 'bg-blue-500'
          } text-white`}
        >
          {isRecording ? 'Recording...' : 'Hold to Talk'}
        </button>
      </div>
    </div>
  );
}