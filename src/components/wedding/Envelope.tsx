import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import tpLogo from "@/assets/tp-logo.png";

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
    }, 1800);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background cursor-pointer"
      onClick={handleClick}
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, hsl(var(--primary) / 0.3) 1px, transparent 1px),
                           radial-gradient(circle at 75% 75%, hsl(var(--secondary) / 0.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="relative flex flex-col items-center gap-8">
        {/* Envelope */}
        <div className="relative w-[320px] h-[220px] sm:w-[400px] sm:h-[270px]">
          {/* Envelope body */}
          <motion.div
            className="absolute inset-0 rounded-lg border border-border/50 overflow-hidden"
            style={{
              background: `linear-gradient(135deg, hsl(var(--card)), hsl(var(--card) / 0.8))`,
              boxShadow: `0 20px 60px -15px hsl(var(--primary) / 0.2), 0 0 0 1px hsl(var(--border) / 0.3)`
            }}
            animate={isOpening ? { scale: 1.05 } : {}}
            transition={{ duration: 0.3 }}
          >
            {/* Inner card peeking out */}
            <AnimatePresence>
              {isOpening && (
                <motion.div
                  className="absolute left-[10%] right-[10%] rounded-t-md flex items-center justify-center"
                  style={{
                    height: '80%',
                    background: `linear-gradient(to bottom, hsl(var(--background)), hsl(var(--card)))`,
                    border: `1px solid hsl(var(--border) / 0.5)`,
                  }}
                  initial={{ bottom: '10%', opacity: 0 }}
                  animate={{ bottom: '60%', opacity: 1 }}
                  transition={{ duration: 1.2, delay: 0.5, ease: [0.4, 0, 0.2, 1] }}
                >
                  <div className="text-center px-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2 font-sans">You are invited to</p>
                    <p className="font-serif text-lg sm:text-xl text-foreground">Tosin & Pelumi's</p>
                    <p className="font-serif text-sm text-primary">Wedding Celebration</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom V shape decoration */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 270" preserveAspectRatio="none">
              <path
                d="M0,0 L200,140 L400,0 L400,270 L0,270 Z"
                fill={`hsl(var(--card))`}
                opacity="0.5"
              />
            </svg>
          </motion.div>

          {/* Envelope flap (top triangle) */}
          <motion.div
            className="absolute top-0 left-0 right-0 origin-top"
            style={{ perspective: '800px' }}
            animate={isOpening ? { rotateX: -180 } : {}}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          >
            <div
              className="w-full overflow-hidden rounded-t-lg"
              style={{
                height: '135px',
                transformStyle: 'preserve-3d',
              }}
            >
              <svg width="100%" height="100%" viewBox="0 0 400 135" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="flapGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={`hsl(220 25% 12%)`} />
                    <stop offset="100%" stopColor={`hsl(220 25% 8%)`} />
                  </linearGradient>
                </defs>
                <path
                  d="M0,0 L400,0 L200,135 Z"
                  fill="url(#flapGrad)"
                  stroke={`hsl(220 20% 18%)`}
                  strokeWidth="1"
                />
              </svg>
            </div>
          </motion.div>

          {/* Wax seal */}
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 z-10"
            style={{ top: '55%' }}
            animate={isOpening ? { scale: 0, opacity: 0, y: -20 } : {}}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <img
              src={tpLogo}
              alt="T&P 2026"
              className="w-24 h-24 sm:w-28 sm:h-28 object-contain drop-shadow-[0_4px_20px_hsl(var(--primary)/0.4)]"
            />
          </motion.div>
        </div>

        {/* Text below */}
        <motion.div
          className="text-center"
          animate={isOpening ? { opacity: 0, y: 20 } : {}}
          transition={{ duration: 0.3 }}
        >
          <p className="wedding-heading text-2xl sm:text-3xl mb-2">Tosin & Pelumi</p>
          <p className="text-muted-foreground text-xs uppercase tracking-[0.3em] font-sans">
            Tap to open your invitation
          </p>
        </motion.div>
      </div>

      {/* Fade out overlay */}
      <AnimatePresence>
        {isOpening && (
          <motion.div
            className="absolute inset-0 bg-background z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.3 }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Envelope;
