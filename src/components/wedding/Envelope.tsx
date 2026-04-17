import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import envelopeArt from "@/assets/envelope-landing.png";

interface EnvelopeProps {
  onOpen: () => void;
}

const Envelope = ({ onOpen }: EnvelopeProps) => {
  const [isOpening, setIsOpening] = useState(false);

  const handleClick = () => {
    if (isOpening) return;
    setIsOpening(true);
    setTimeout(() => {
      onOpen();
    }, 1400);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background cursor-pointer overflow-hidden"
      onClick={handleClick}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vmin] h-[80vmin] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <motion.div
        className="relative flex flex-col items-center"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{
          opacity: isOpening ? 0 : 1,
          scale: isOpening ? 1.08 : 1,
        }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
      >
        <motion.img
          src={envelopeArt}
          alt="Tosin & Pelumi — Tap to open your invitation"
          className="w-[88vmin] max-w-[640px] h-auto object-contain select-none drop-shadow-[0_30px_80px_hsl(var(--primary)/0.35)]"
          draggable={false}
          animate={{
            y: [0, -8, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Pulse hint */}
        <motion.p
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-muted-foreground text-[10px] sm:text-xs uppercase tracking-[0.4em] font-sans whitespace-nowrap"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          Tap anywhere to open
        </motion.p>
      </motion.div>

      {/* Fade out overlay */}
      <AnimatePresence>
        {isOpening && (
          <motion.div
            className="absolute inset-0 bg-background z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Envelope;
