"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
import { CLOUDINARY_FALLBACK } from "@/lib/constants";
import { cn } from "@/lib/utils";

const LIDS = [
  {
    left: "40%",
    top: "42.5%",
    color: "radial-gradient(circle at 50% 30%, #1e86e6, #1572dc)",
    delay: 0,
  },
  {
    left: "57%",
    top: "42.5%",
    color: "radial-gradient(circle at 50% 30%, #1fa0e4, #1689dc)",
    delay: 0.06,
  },
];

export function GrowMateMascot({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 120, damping: 14 });
  const sy = useSpring(my, { stiffness: 120, damping: 14 });
  const rotateY = useTransform(sx, [-1, 1], [-14, 14]);
  const rotateX = useTransform(sy, [-1, 1], [12, -12]);
  const tx = useTransform(sx, [-1, 1], [-6, 6]);
  const [blink, setBlink] = useState(false);
  const [boop, setBoop] = useState(0);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      mx.set(Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth / 2))));
      my.set(Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight / 2))));
    };
    window.addEventListener("pointermove", onMove);
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(
        () => {
          setBlink(true);
          setTimeout(() => setBlink(false), 160);
          loop();
        },
        2400 + Math.random() * 2400,
      );
    };
    loop();
    return () => {
      window.removeEventListener("pointermove", onMove);
      clearTimeout(t);
    };
  }, [mx, my]);

  return (
    <div
      ref={ref}
      style={{ perspective: 600 }}
      className={cn("relative select-none pointer-events-auto cursor-pointer", className)}
      onClick={() => setBoop((b) => b + 1)}
    >
      <motion.div
        style={{ rotateX, rotateY, x: tx }}
        animate={{
          scale: boop ? [1, 1.15, 0.95, 1.05, 1] : 1,
          rotate: boop ? [0, -6, 6, -3, 0] : 0,
        }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full h-full"
      >
        <img
          src={CLOUDINARY_FALLBACK.mascot || "/growmate-mascot.png"}
          alt="GrowMate Mascot"
          className="w-full h-full object-contain drop-shadow-md"
          draggable={false}
        />
        {LIDS.map((lid, idx) => (
          <motion.div
            key={idx}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
            style={{
              left: lid.left,
              top: lid.top,
              width: "8%",
              height: "5%",
              background: lid.color,
              transformOrigin: "top center",
            }}
            animate={{ scaleY: blink ? 1 : 0 }}
            transition={{
              duration: 0.1,
              delay: lid.delay,
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}
