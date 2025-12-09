"use client";
import HeroText from "@/components/hero-text";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { useUsername } from "@/hooks/use-username";
import { api } from "@/lib/client";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const Page = () => {
  return (
    <Suspense>
      <Lobby />
    </Suspense>
  );
};

function Lobby() {
  const { username } = useUsername();
  const router = useRouter();

  const searchParams = useSearchParams();

  const wasDestroyed = searchParams.get("destroyed") === "true";
  const error = searchParams.get("error");

  const { mutate: createRoom } = useMutation({
    mutationFn: async () => {
      const res = await api.room.create.post();

      if (res.status === 200) router.push(`/room/${res.data?.roomId}`);
    },
  });

  return (
    <main className="flex flex-col min-h-screen items-center justify-center p-4">
      {wasDestroyed && (
        <div className="flex flex-col items-center justify-center border p-5 mb-10">
          <p>Room Has Expired</p>
          <span className="text-stone-300">
            All messages were permanently deleted.
          </span>
        </div>
      )}
      {error === "room-not-found" && (
        <div className="flex flex-col items-center justify-center border p-5 mb-10">
          <p>Room Not Found</p>
          <span className="text-stone-300">
            This room may have expired or never existed.
          </span>
        </div>
      )}
      {error === "room-full" && (
        <div className="flex flex-col items-center justify-center border p-5 mb-10">
          <p>Room Full</p>
          <span className="text-stone-300">
            This room is at maximum capacity.
          </span>
        </div>
      )}
      <div className="w-full max-w-md space-y-5 flex flex-col items-center justify-center">
        <HeroText />
        <p className="text-sm text-stone-300">
          A private, self-desctructing real time chat room.
        </p>
        <div className="flex items-center gap-1 mt-8">
          <p>Welcome,</p>
          <span className="font-semibold text-green-300">{username}</span>
        </div>
        <div className="w-[50%]">
          <InteractiveHoverButton onClick={() => createRoom()} />
        </div>
      </div>
    </main>
  );
}

export default Page;
