"use client";
import HeroText from "@/components/hero-text";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Check, Copy, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import {
  ChatInput,
  ChatInputSubmit,
  ChatInputTextArea,
} from "@/components/ui/chat-input";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client";
import { useUsername } from "@/hooks/use-username";
import { format } from "date-fns";
import { useRealtime } from "@/lib/realtime-client";
import { Message } from "@/lib/realtime";

function formatTimeRemaining(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function Page() {
  const params = useParams();
  const roomId = params.roomId as string;
  const router = useRouter();
  const [copied, setCopied] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const { username } = useUsername();

  const { data: ttlData } = useQuery({
    queryKey: ["ttl", roomId],
    queryFn: async () => {
      const res = await api.room.ttl.get({
        query: { roomId },
      });
      return res.data;
    },
  });

  useEffect(() => {
    if (ttlData?.ttl !== undefined) setTimeRemaining(ttlData.ttl);
  }, [ttlData]);

  useEffect(() => {
    if (timeRemaining === null || timeRemaining < 0) return;

    if (timeRemaining === 0) {
      router.push("/?destroyed=true");
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, router]);

  const { mutate: sendMessage } = useMutation({
    mutationFn: async ({ text }: { text: string }) => {
      await api.messages.post(
        { sender: username, text },
        { query: { roomId } }
      );

      setInput("");
    },
  });

  const { data: messages, refetch } = useQuery({
    queryKey: ["messages", roomId],
    queryFn: async () => {
      const res = await api.messages.get({ query: { roomId } });
      return res.data;
    },
  });

  useRealtime({
    channels: [roomId],
    events: ["chat.message", "chat.destroy"],
    onData: ({ event }) => {
      if (event === "chat.message") {
        refetch();
      }

      if (event === "chat.destroy") {
        router.push("/?destroyed=true");
      }
    },
  });

  const { mutate: destroyRoom } = useMutation({
    mutationFn: async () => {
      await api.room.delete(null, { query: { roomId } });
    },
  });

  const handleCopy = async () => {
    try {
      const url = window.location.href;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <main className="flex flex-col h-screen max-h-screen overflow-hidden">
      <header className="flex items-center justify-between p-5">
        <div className="flex items-center gap-10">
          <HeroText />
          <div className="flex flex-col">
            <p className="font-semibold text-stone-300">ROOM ID</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-green-300">{roomId}</span>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="disabled:opacity-100"
                      onClick={handleCopy}
                      aria-label={copied ? "Copied" : "Copy to clipboard"}
                      disabled={copied}
                    >
                      <div
                        className={cn(
                          "transition-all",
                          copied ? "scale-100 opacity-100" : "scale-0 opacity-0"
                        )}
                      >
                        <Check
                          className="stroke-emerald-500"
                          size={10}
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                      </div>
                      <div
                        className={cn(
                          "absolute transition-all",
                          copied ? "scale-0 opacity-0" : "scale-100 opacity-100"
                        )}
                      >
                        <Copy size={10} strokeWidth={2} aria-hidden="true" />
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="px-2 py-1 text-xs">
                    Click to copy
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-14">
          <div>
            <span className="text-sm uppercase text-stone-300">
              Self Destruct
            </span>
            <span
              className={`text-sm font-bold flex items-center gap-2 ${
                timeRemaining !== null && timeRemaining < 60
                  ? "text-red-500"
                  : "text-amber-500"
              }`}
            >
              {timeRemaining !== null
                ? formatTimeRemaining(timeRemaining)
                : "--:--"}
            </span>
          </div>
          <Button variant="destructive" onClick={() => destroyRoom()}>
            <Trash
              className="-ms-1 me-2"
              size={16}
              strokeWidth={2}
              aria-hidden="true"
            />
            DESTROY NOW
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin border-t rounded-xl">
        {messages?.messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-stone-300">
              No messages yet, start the conversation.
            </p>
          </div>
        )}

        {messages?.messages.map((msg: Message) => (
          <div key={msg.id} className="flex flex-col items-start">
            <div className="max-w-[80%] group">
              <div className="flex items-baseline gap-3 mb-1">
                <span
                  className={`${
                    msg.sender === username ? "text-stone-50" : "text-blue-500"
                  } font-semibold text-sm`}
                >
                  {msg.sender === username ? "You" : msg.sender}
                </span>
                <span className="text-xs text-stone-300">
                  {format(msg.timestamp, "HH:mm")}
                </span>
              </div>
              <p className="text-sm leading-relaxed break-all text-stone-200">
                {msg.text}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4">
        <ChatInput
          variant="default"
          onChange={(e) => setInput(e.target.value)}
          value={input}
          onSubmit={() => {
            sendMessage({ text: input });
          }}
        >
          <ChatInputTextArea placeholder="Type a message..." autoFocus />
          <ChatInputSubmit className="cursor-pointer" />
        </ChatInput>
      </div>
    </main>
  );
}
