'use client';

import React, { useEffect, useRef, useState } from "react";

// UI components
import Transcript from "./Transcript";
import Events from "./Events";
import BottomToolbar from "./BottomToolbar";

// Types
import { AgentConfig, SessionStatus } from "@/app/types";

// Context providers & hooks
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useHandleServerEvent } from "@/app/hooks/useHandleServerEvent";

import { createRealtimeConnection } from "@/app/lib/realtimeConnection";


import { allAgentSets, defaultAgentSetKey } from "@/app/agentConfigs";
import { useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from 'uuid';

interface EventObject {
  type: string;
  // Add other properties as needed
  [key: string]: unknown; // Use unknown instead of any
}

export default function Chat({ firstName }: { firstName: string }) {
  const searchParams = useSearchParams();

  const { transcriptItems, addTranscriptMessage, addTranscriptBreadcrumb } =
    useTranscript();
  const { logClientEvent, logServerEvent } = useEvent();

  const [selectedAgentName, setSelectedAgentName] = useState<string>("");
  const [selectedAgentConfigSet, setSelectedAgentConfigSet] =
    useState<AgentConfig[] | null>(null);

  // const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus>("DISCONNECTED");

  const [isEventsPaneExpanded, setIsEventsPaneExpanded] =
    useState<boolean>(true);
  const [isTranscriptVisible, setIsTranscriptVisible] = useState<boolean>(false);
  const [userText, setUserText] = useState<string>("");
  // const [isPTTActive, setIsPTTActive] = useState<boolean>(false);
  // const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState<boolean>(false);

    const sendClientEvent = (eventObj: EventObject, eventNameSuffix = "") => {
      if (dcRef.current && dcRef.current.readyState === "open") {
        logClientEvent(eventObj, eventNameSuffix);
        dcRef.current.send(JSON.stringify(eventObj));
      } else {
        logClientEvent(
          { attemptedEvent: eventObj.type },
          "error.data_channel_not_open"
        );
        console.error(
          "Failed to send message - no data channel available",
          eventObj
        );
      }
    };

    const handleServerEventRef = useHandleServerEvent({
      setSessionStatus,
      selectedAgentName,
      selectedAgentConfigSet,
      sendClientEvent,
      setSelectedAgentName,
    });

    useEffect(() => {
      let finalAgentConfig = searchParams.get("agentConfig");
      if (!finalAgentConfig || !allAgentSets[finalAgentConfig]) {
        finalAgentConfig = defaultAgentSetKey;
        const url = new URL(window.location.toString());
        url.searchParams.set("agentConfig", finalAgentConfig);
        window.location.replace(url.toString());
        return;
      }

      const agents = allAgentSets[finalAgentConfig];
      const agentKeyToUse = agents[0]?.name || "";
      // const agentKeyToUse = "random";

      setSelectedAgentName(agentKeyToUse);
      setSelectedAgentConfigSet(agents);
    }, [searchParams]);

    // useEffect(() => {
    //   if (selectedAgentName && sessionStatus === "DISCONNECTED") {
    //     connectToRealtime();
    //   }
    // }, [selectedAgentName]);

    useEffect(() => {
      if (
        sessionStatus === "CONNECTED" &&
        selectedAgentConfigSet &&
        selectedAgentName
      ) {
        let currentAgent;
        if (selectedAgentName === "Random Student") {
          const randomIndex = Math.floor(Math.random() * (selectedAgentConfigSet.length - 1));
          // currentAgent = selectedAgentConfigSet[randomIndex + 1];
        } else {
          currentAgent = selectedAgentConfigSet.find(
            (a) => a.name === selectedAgentName
          );
        }
        addTranscriptBreadcrumb(
          `Agent: ${selectedAgentName}`,
          currentAgent
        );
        updateSession(true);
      }
    }, [selectedAgentConfigSet, selectedAgentName, sessionStatus]);

    // useEffect(() => {
    //   if (sessionStatus === "CONNECTED") {
    //     console.log(
    //       `updatingSession, isPTTACtive=${isPTTActive} sessionStatus=${sessionStatus}`
    //     );
    //     updateSession();
    //   }
    // }, [isPTTActive]);

    const fetchEphemeralKey = async (): Promise<string | null> => {
      logClientEvent({ url: "/session" }, "fetch_session_token_request");
      const tokenResponse = await fetch("/api/session");
      const data = await tokenResponse.json();
      logServerEvent(data, "fetch_session_token_response");

      if (!data.client_secret?.value) {
        logClientEvent(data, "error.no_ephemeral_key");
        console.error("No ephemeral key provided by the server");
        setSessionStatus("DISCONNECTED");
        return null;
      }

      return data.client_secret.value;
    };

    const connectToRealtime = async () => {
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
        pcRef.current = pc;
        dcRef.current = dc;

        dc.addEventListener("open", () => {
          logClientEvent({}, "data_channel.open");
        });
        dc.addEventListener("close", () => {
          logClientEvent({}, "data_channel.close");
        });
        dc.addEventListener("error", (err: RTCErrorEvent) => {
          logClientEvent({ error: err }, "data_channel.error");
        });
        dc.addEventListener("message", (e: MessageEvent) => {
          handleServerEventRef.current(JSON.parse(e.data));
        });

        // setDataChannel(dc);
      } catch (err) {
        console.error("Error connecting to realtime:", err);
        setSessionStatus("DISCONNECTED");
      }
    };

    const disconnectFromRealtime = () => {
      if (pcRef.current) {
        pcRef.current.getSenders().forEach((sender) => {
          if (sender.track) {
            sender.track.stop();
          }
        });

        pcRef.current.close();
        pcRef.current = null;
      }
      // setDataChannel(null);
      setSessionStatus("DISCONNECTED");
      // setIsPTTUserSpeaking(false);

      logClientEvent({}, "disconnected");
    };

    const sendSimulatedUserMessage = (text: string) => {
    const id = uuidv4().slice(0, 32);
      addTranscriptMessage(id, "user", text, true);

      sendClientEvent(
        {
          type: "conversation.item.create",
          item: {
            id,
            type: "message",
            role: "user",
            content: [{ type: "input_text", text }],
          },
        },
        "(simulated user text message)"
      );
      sendClientEvent(
        { type: "response.create" },
        "(trigger response after simulated user text message)"
      );
    };

    const updateSession = (shouldTriggerResponse: boolean = false) => {
      sendClientEvent(
        { type: "input_audio_buffer.clear" },
        "clear audio buffer on session update"
      );

      let currentAgent;
      if (selectedAgentName === "Random Student" && selectedAgentConfigSet) {
        const randomIndex = Math.floor(Math.random() * (selectedAgentConfigSet.length - 1));
        currentAgent = selectedAgentConfigSet[randomIndex + 1];
      } else {
        currentAgent = selectedAgentConfigSet?.find(
          (a) => a.name === selectedAgentName
        );
      }

      if (!currentAgent) {
        console.warn("No current agent found for the selected agent name.");
      } else {
        console.log("Current Agent Instructions:", currentAgent.instructions);
      }

      const turnDetection = /*isPTTActive
        ? null
        :*/ {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 200,
            create_response: true,
          };

      const instructions = currentAgent?.instructions || "";
      const tools = currentAgent?.tools || [];

      console.log("Session Update Event Instructions:", instructions);

      const sessionUpdateEvent = {
        type: "session.update",
        session: {
          modalities: ["text", "audio"],
          instructions,
          voice: "coral",
          input_audio_format: "pcm16",
          output_audio_format: "pcm16",
          input_audio_transcription: { model: "whisper-1" },
          turn_detection: turnDetection,
          tools,
        },
      };

      sendClientEvent(sessionUpdateEvent);

      if (shouldTriggerResponse) {
        console.log("Triggering simulated user message.");
        sendSimulatedUserMessage("Hey, it's " + firstName + " here - your coach. What can I help you with today?");
      }
    };

    const cancelAssistantSpeech = async () => {
      const mostRecentAssistantMessage = [...transcriptItems]
        .reverse()
        .find((item) => item.role === "assistant");

      if (!mostRecentAssistantMessage) {
        console.warn("can't cancel, no recent assistant message found");
        return;
      }
      if (mostRecentAssistantMessage.status === "DONE") {
        console.log("No truncation needed, message is DONE");
        return;
      }

      sendClientEvent({
        type: "conversation.item.truncate",
        item_id: mostRecentAssistantMessage?.itemId,
        content_index: 0,
        audio_end_ms: Date.now() - mostRecentAssistantMessage.createdAtMs,
      });
      sendClientEvent(
        { type: "response.cancel" },
        "(cancel due to user interruption)"
      );
    };

    const handleSendTextMessage = () => {
      if (!userText.trim()) return;
      cancelAssistantSpeech();

      sendClientEvent(
        {
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: userText.trim() }],
          },
        },
        "(send user text message)"
      );
      setUserText("");

      sendClientEvent({ type: "response.create" }, "trigger response");
    };

    // const handleTalkButtonDown = () => {
    //   if (sessionStatus !== "CONNECTED" || dataChannel?.readyState !== "open")
    //     return;
    //   cancelAssistantSpeech();

    //   setIsPTTUserSpeaking(true);
    //   sendClientEvent({ type: "input_audio_buffer.clear" }, "clear PTT buffer");
    // };

    // const handleTalkButtonUp = () => {
    //   if (
    //     sessionStatus !== "CONNECTED" ||
    //     dataChannel?.readyState !== "open" ||
    //     !isPTTUserSpeaking
    //   )
    //     return;

    //   setIsPTTUserSpeaking(false);
    //   sendClientEvent({ type: "input_audio_buffer.commit" }, "commit PTT");
    //   sendClientEvent({ type: "response.create" }, "trigger response PTT");
    // };

    const onToggleConnection = () => {
      if (sessionStatus === "CONNECTED" || sessionStatus === "CONNECTING") {
        disconnectFromRealtime();
        setSessionStatus("DISCONNECTED");
      } else {
        connectToRealtime();
      }
    };

    // const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    //   const newAgentConfig = e.target.value;
    //   const url = new URL(window.location.toString());
    //   url.searchParams.set("agentConfig", newAgentConfig);
    //   window.location.replace(url.toString());
    // };

    const handleSelectedAgentChange = (
      e: React.ChangeEvent<HTMLSelectElement>
    ) => {
      const newAgentName = e.target.value;
      setSelectedAgentName(newAgentName);
    };

    useEffect(() => {
      // const storedPushToTalkUI = localStorage.getItem("pushToTalkUI");
    //   if (storedPushToTalkUI) {
    //     setIsPTTActive(storedPushToTalkUI === "true");
    //   }
      const storedLogsExpanded = localStorage.getItem("logsExpanded");
      if (storedLogsExpanded) {
        setIsEventsPaneExpanded(storedLogsExpanded === "true");
      }
      const storedTranscriptVisible = localStorage.getItem("transcriptVisible");
      if (storedTranscriptVisible) {
        setIsTranscriptVisible(storedTranscriptVisible === "true");
      }
    }, []);

    // useEffect(() => {
    //   localStorage.setItem("pushToTalkUI", isPTTActive.toString());
    // }, [isPTTActive]);

    useEffect(() => {
      localStorage.setItem("logsExpanded", isEventsPaneExpanded.toString());
    }, [isEventsPaneExpanded]);

    useEffect(() => {
      localStorage.setItem("transcriptVisible", isTranscriptVisible.toString());
    }, [isTranscriptVisible]);

    useEffect(() => {
      if (audioElementRef.current) {
        audioElementRef.current.play().catch((err) => {
          console.warn("Autoplay may be blocked by browser:", err);
        });
      }
    }, []);

    const agentSetKey = "default";

    const CallInProgressMessage = () => (
      <div className="flex-1 flex items-center justify-center bg-white rounded-xl">
        <div className="text-center p-8">
          <div className="text-2xl font-semibold mb-2">Call status:</div>
          <div className="text-gray-500">
            {sessionStatus === "CONNECTED" ?
              "Your call is active. Scenario: " + selectedAgentName :
              "Waiting to connect..."}
          </div>
          {/* {sessionStatus === "CONNECTED" && isPTTActive && (
            <div className="mt-4 text-sm text-gray-600">Press the Talk button to speak</div>
          )} */}
        </div>
      </div>
    );

    return (
      <div style={{ height: '80vh' }} className="text-base flex flex-col bg-gray-100 text-gray-800 relative">
        <div className="p-5 text-lg font-semibold flex justify-between items-center">
          <div className="flex items-center">
            <div onClick={() => window.location.reload()} style={{ cursor: 'pointer' }}>
            </div>
            <div>
              Practice a conversation with a student
            </div>
          </div>
          <div className="flex items-center">
            {/*<label className="flex items-center text-base gap-1 mr-2 font-medium">
              Scenario
            </label>
            <div className="relative inline-block">
              <select
                value={agentSetKey}
                onChange={handleAgentChange}
                className="appearance-none border border-gray-300 rounded-lg text-base px-2 py-1 pr-8 cursor-pointer font-normal focus:outline-none"
              >
                {Object.keys(allAgentSets).map((agentKey) => (
                  <option key={agentKey} value={agentKey}>
                    {agentKey}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-600">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.44l3.71-3.21a.75.75 0 111.04 1.08l-4.25 3.65a.75.75 0 01-1.04 0L5.21 8.27a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div> */}

            {agentSetKey && (
              <div className="flex items-center ml-6">
                <label className="flex items-center text-base gap-1 mr-2 font-medium">
                  Scenario
                </label>
                <div className="relative inline-block">
                  <select
                    value={selectedAgentName}
                    onChange={handleSelectedAgentChange}
                    className="appearance-none border border-gray-300 rounded-lg text-base px-2 py-1 pr-8 cursor-pointer font-normal focus:outline-none"
                  >
                    {selectedAgentConfigSet?.map(agent => (
                      <option key={agent.name} value={agent.name}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-600">
                    <svg
                      className="h-8 w-8"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 10.44l3.71-3.21a.75.75 0 111.04 1.08l-4.25 3.65a.75.75 0 01-1.04 0L5.21 8.27a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-1 gap-2 px-2 overflow-hidden relative">
          {isTranscriptVisible ? (
            <Transcript
              userText={userText}
              setUserText={setUserText}
              onSendMessage={handleSendTextMessage}
              canSend={
                sessionStatus === "CONNECTED" &&
                dcRef.current?.readyState === "open"
              }
            />
          ) : (
            <CallInProgressMessage />
          )}

          {isEventsPaneExpanded && <Events isExpanded={isEventsPaneExpanded} />}
        </div>

        <BottomToolbar
          sessionStatus={sessionStatus}
          onToggleConnection={onToggleConnection}
          // isPTTActive={isPTTActive}
          // setIsPTTActive={setIsPTTActive}
          // isPTTUserSpeaking={isPTTUserSpeaking}
          // handleTalkButtonDown={handleTalkButtonDown}
          // handleTalkButtonUp={handleTalkButtonUp}
          isEventsPaneExpanded={isEventsPaneExpanded}
          setIsEventsPaneExpanded={setIsEventsPaneExpanded}
          isTranscriptVisible={isTranscriptVisible}
          setIsTranscriptVisible={setIsTranscriptVisible}
        />
      </div>
    );
}