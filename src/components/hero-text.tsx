"use client";

import CornerFrameScrambleText from "@/components/ui/corner-frame-scramble-text";
import Link from "next/link";

export default function HeroText() {
  return (
    <Link href={"/"}>
      <CornerFrameScrambleText
        value="Real Time Chat"
        as="h5"
        className="text-xl text-foreground text-center"
      />
    </Link>
  );
}
