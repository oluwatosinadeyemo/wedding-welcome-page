import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface EnvelopeProps {
  onOpen: () => void;
}

const SILVER_BRIGHT = "#d6dde8";
const SILVER_MID = "#9aa4b5";
const SILVER_DARK = "#4a5368";
const SAPPHIRE = "#1e3a8a";
const SAPPHIRE_LIGHT = "#3b5bb5";

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
      className="fixed inset-0 z-[100] flex items-center justify-center cursor-pointer overflow-hidden"
      onClick={handleClick}
      style={{
        background:
          "radial-gradient(ellipse at center, #121826 0%, #080b13 70%, #04060b 100%)",
      }}
    >
      {/* Crosshatch mesh pattern */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: `
            linear-gradient(45deg, ${SILVER_MID} 1px, transparent 1px),
            linear-gradient(-45deg, ${SILVER_MID} 1px, transparent 1px)
          `,
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 85%)",
        }}
      />

      {/* Ornate filigree border frame */}
      <svg
        className="absolute inset-4 sm:inset-8 md:inset-12 pointer-events-none"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="silverFrame" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={SILVER_BRIGHT} />
            <stop offset="50%" stopColor={SILVER_MID} />
            <stop offset="100%" stopColor={SILVER_DARK} />
          </linearGradient>
        </defs>
        {/* Outer rectangle */}
        <rect
          x="15"
          y="15"
          width="970"
          height="970"
          fill="none"
          stroke="url(#silverFrame)"
          strokeWidth="1.5"
        />
        {/* Inner rectangle */}
        <rect
          x="30"
          y="30"
          width="940"
          height="940"
          fill="none"
          stroke="url(#silverFrame)"
          strokeWidth="0.8"
          opacity="0.7"
        />

        {/* Corner flourishes — 4 corners via transforms */}
        {[
          { x: 30, y: 30, r: 0 },
          { x: 970, y: 30, r: 90 },
          { x: 970, y: 970, r: 180 },
          { x: 30, y: 970, r: 270 },
        ].map((c, i) => (
          <g
            key={i}
            transform={`translate(${c.x} ${c.y}) rotate(${c.r})`}
            stroke="url(#silverFrame)"
            strokeWidth="1"
            fill="none"
          >
            <path d="M0,60 Q10,30 40,20 Q70,10 90,0" />
            <path d="M20,60 Q30,40 50,35 Q70,30 80,20" opacity="0.7" />
            <path d="M0,80 Q25,55 55,50" opacity="0.5" />
            <circle cx="45" cy="25" r="2" fill={SILVER_BRIGHT} opacity="0.9" />
            <path
              d="M50,40 q-6,-4 -12,0 q6,4 12,0 q6,-4 12,0 q-6,4 -12,0"
              opacity="0.6"
            />
          </g>
        ))}

        {/* Decorative mid-edge flourishes */}
        {[
          { cx: 500, cy: 30 },
          { cx: 500, cy: 970 },
          { cx: 30, cy: 500 },
          { cx: 970, cy: 500 },
        ].map((p, i) => (
          <g
            key={`edge-${i}`}
            stroke="url(#silverFrame)"
            strokeWidth="0.8"
            fill="none"
            opacity="0.7"
          >
            <circle cx={p.cx} cy={p.cy} r="4" fill={SILVER_BRIGHT} opacity="0.8" />
            <circle cx={p.cx} cy={p.cy} r="10" />
          </g>
        ))}
      </svg>

      {/* Center stack */}
      <div className="relative flex flex-col items-center gap-6 px-6">
        {/* Wreath + monogram */}
        <motion.div
          className="relative"
          animate={isOpening ? { scale: 0.9, opacity: 0, y: -30 } : {}}
          transition={{ duration: 0.5 }}
        >
          <svg
            width="260"
            height="260"
            viewBox="0 0 260 260"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-[0_0_40px_rgba(59,91,181,0.45)]"
          >
            <defs>
              <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={SILVER_BRIGHT} />
                <stop offset="45%" stopColor="#ffffff" />
                <stop offset="55%" stopColor={SILVER_MID} />
                <stop offset="100%" stopColor={SILVER_DARK} />
              </linearGradient>
              <radialGradient id="sapphire" cx="0.35" cy="0.35" r="0.7">
                <stop offset="0%" stopColor={SAPPHIRE_LIGHT} />
                <stop offset="60%" stopColor={SAPPHIRE} />
                <stop offset="100%" stopColor="#0b1a4a" />
              </radialGradient>
              <linearGradient id="leafGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={SILVER_BRIGHT} />
                <stop offset="100%" stopColor={SILVER_DARK} />
              </linearGradient>
              <linearGradient id="monoGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e8ecf5" />
                <stop offset="50%" stopColor="#6b7a9a" />
                <stop offset="100%" stopColor={SAPPHIRE} />
              </linearGradient>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Outer silver ring */}
            <circle
              cx="130"
              cy="130"
              r="82"
              fill="none"
              stroke="url(#ringGrad)"
              strokeWidth="6"
              filter="url(#glow)"
            />
            <circle
              cx="130"
              cy="130"
              r="82"
              fill="none"
              stroke={SILVER_BRIGHT}
              strokeWidth="1"
              opacity="0.6"
            />

            {/* Leaves + sapphires around wreath (upper-left and upper-right clusters) */}
            {/* Upper left leaves */}
            <g opacity="0.95">
              {[
                { cx: 70, cy: 70, r: -35 },
                { cx: 60, cy: 95, r: -20 },
                { cx: 55, cy: 125, r: 0 },
                { cx: 85, cy: 55, r: -55 },
                { cx: 105, cy: 48, r: -75 },
              ].map((l, i) => (
                <g
                  key={`leafL-${i}`}
                  transform={`translate(${l.cx} ${l.cy}) rotate(${l.r})`}
                >
                  <path
                    d="M0,0 Q6,-10 14,-4 Q8,6 0,0 Z"
                    fill="url(#leafGrad)"
                    stroke={SILVER_DARK}
                    strokeWidth="0.4"
                  />
                  <path
                    d="M0,0 Q6,-10 14,-4"
                    fill="none"
                    stroke={SILVER_BRIGHT}
                    strokeWidth="0.6"
                    opacity="0.8"
                  />
                </g>
              ))}
              {/* Sapphires on left */}
              {[
                { cx: 62, cy: 82, r: 3.5 },
                { cx: 52, cy: 108, r: 2.8 },
                { cx: 78, cy: 62, r: 3 },
                { cx: 98, cy: 54, r: 2.5 },
                { cx: 48, cy: 138, r: 3.2 },
              ].map((s, i) => (
                <g key={`sapL-${i}`}>
                  <circle
                    cx={s.cx}
                    cy={s.cy}
                    r={s.r + 1.5}
                    fill={SAPPHIRE_LIGHT}
                    opacity="0.25"
                  />
                  <circle cx={s.cx} cy={s.cy} r={s.r} fill="url(#sapphire)" />
                  <circle
                    cx={s.cx - s.r * 0.3}
                    cy={s.cy - s.r * 0.3}
                    r={s.r * 0.25}
                    fill="#ffffff"
                    opacity="0.75"
                  />
                </g>
              ))}
            </g>

            {/* Upper right leaves */}
            <g opacity="0.95">
              {[
                { cx: 190, cy: 70, r: 35 },
                { cx: 200, cy: 95, r: 20 },
                { cx: 205, cy: 125, r: 0 },
                { cx: 175, cy: 55, r: 55 },
                { cx: 155, cy: 48, r: 75 },
                { cx: 215, cy: 150, r: -15 },
              ].map((l, i) => (
                <g
                  key={`leafR-${i}`}
                  transform={`translate(${l.cx} ${l.cy}) rotate(${l.r})`}
                >
                  <path
                    d="M0,0 Q-6,-10 -14,-4 Q-8,6 0,0 Z"
                    fill="url(#leafGrad)"
                    stroke={SILVER_DARK}
                    strokeWidth="0.4"
                  />
                  <path
                    d="M0,0 Q-6,-10 -14,-4"
                    fill="none"
                    stroke={SILVER_BRIGHT}
                    strokeWidth="0.6"
                    opacity="0.8"
                  />
                </g>
              ))}
              {/* Sapphires on right */}
              {[
                { cx: 198, cy: 82, r: 3.5 },
                { cx: 208, cy: 108, r: 2.8 },
                { cx: 182, cy: 62, r: 3 },
                { cx: 162, cy: 54, r: 2.5 },
                { cx: 212, cy: 138, r: 3.2 },
                { cx: 218, cy: 160, r: 2.5 },
              ].map((s, i) => (
                <g key={`sapR-${i}`}>
                  <circle
                    cx={s.cx}
                    cy={s.cy}
                    r={s.r + 1.5}
                    fill={SAPPHIRE_LIGHT}
                    opacity="0.25"
                  />
                  <circle cx={s.cx} cy={s.cy} r={s.r} fill="url(#sapphire)" />
                  <circle
                    cx={s.cx - s.r * 0.3}
                    cy={s.cy - s.r * 0.3}
                    r={s.r * 0.25}
                    fill="#ffffff"
                    opacity="0.75"
                  />
                </g>
              ))}
            </g>

            {/* Monogram plaque background */}
            <rect
              x="75"
              y="95"
              width="110"
              height="70"
              rx="4"
              fill="#0a0f1c"
              opacity="0.6"
            />

            {/* T&P monogram */}
            <text
              x="130"
              y="140"
              textAnchor="middle"
              fontFamily="'Playfair Display', Georgia, serif"
              fontSize="46"
              fontWeight="700"
              fontStyle="italic"
              fill="url(#monoGrad)"
              stroke={SILVER_BRIGHT}
              strokeWidth="0.3"
            >
              T&amp;P
            </text>
            {/* 2026 */}
            <text
              x="130"
              y="162"
              textAnchor="middle"
              fontFamily="'Inter', sans-serif"
              fontSize="11"
              letterSpacing="4"
              fill={SILVER_BRIGHT}
              opacity="0.85"
            >
              2026
            </text>
          </svg>

          {/* Navy bow at bottom of wreath */}
          <svg
            className="absolute left-1/2 -translate-x-1/2"
            style={{ bottom: "18px" }}
            width="70"
            height="40"
            viewBox="0 0 70 40"
          >
            <defs>
              <radialGradient id="bowGrad" cx="0.5" cy="0.4" r="0.7">
                <stop offset="0%" stopColor={SAPPHIRE_LIGHT} />
                <stop offset="100%" stopColor="#0b1a4a" />
              </radialGradient>
            </defs>
            {/* Left loop */}
            <path
              d="M35,20 Q10,8 5,22 Q8,32 35,24 Z"
              fill="url(#bowGrad)"
              stroke={SILVER_MID}
              strokeWidth="0.5"
            />
            {/* Right loop */}
            <path
              d="M35,20 Q60,8 65,22 Q62,32 35,24 Z"
              fill="url(#bowGrad)"
              stroke={SILVER_MID}
              strokeWidth="0.5"
            />
            {/* Center knot */}
            <rect
              x="30"
              y="16"
              width="10"
              height="12"
              rx="2"
              fill={SAPPHIRE}
              stroke={SILVER_BRIGHT}
              strokeWidth="0.6"
            />
            {/* Highlight on knot */}
            <rect x="32" y="18" width="2" height="8" fill={SILVER_BRIGHT} opacity="0.5" />
          </svg>
        </motion.div>

        {/* Envelope */}
        <div className="relative w-[300px] h-[200px] sm:w-[360px] sm:h-[240px]">
          {/* Envelope body */}
          <motion.div
            className="absolute inset-0 rounded-md overflow-hidden"
            style={{
              background:
                "linear-gradient(160deg, #1a2033 0%, #0c1020 55%, #06080f 100%)",
              boxShadow:
                "0 25px 70px -20px rgba(30,58,138,0.5), 0 0 0 1px rgba(154,164,181,0.15), inset 0 0 60px rgba(59,91,181,0.08)",
            }}
            animate={isOpening ? { scale: 1.04 } : {}}
            transition={{ duration: 0.3 }}
          >
            {/* Lace pattern peeking from top */}
            <svg
              className="absolute left-[8%] right-[8%] top-[6%]"
              style={{ width: "84%", height: "65%" }}
              viewBox="0 0 300 150"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id="laceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c5d0e0" />
                  <stop offset="100%" stopColor="#6a7590" />
                </linearGradient>
                <pattern
                  id="lacePattern"
                  x="0"
                  y="0"
                  width="24"
                  height="24"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="12" cy="12" r="6" fill="none" stroke="url(#laceGrad)" strokeWidth="0.6" />
                  <circle cx="0" cy="0" r="3" fill="none" stroke="url(#laceGrad)" strokeWidth="0.5" />
                  <circle cx="24" cy="0" r="3" fill="none" stroke="url(#laceGrad)" strokeWidth="0.5" />
                  <circle cx="0" cy="24" r="3" fill="none" stroke="url(#laceGrad)" strokeWidth="0.5" />
                  <circle cx="24" cy="24" r="3" fill="none" stroke="url(#laceGrad)" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="300" height="150" fill="url(#lacePattern)" opacity="0.55" />
            </svg>

            {/* Bottom V shape (envelope fold) */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 360 240"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="vGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0c1020" />
                  <stop offset="100%" stopColor="#05070e" />
                </linearGradient>
              </defs>
              <path
                d="M0,0 L180,130 L360,0 L360,240 L0,240 Z"
                fill="url(#vGrad)"
                stroke="rgba(154,164,181,0.18)"
                strokeWidth="0.5"
              />
            </svg>

            {/* Sapphire dust at envelope fold */}
            <svg
              className="absolute left-1/2 -translate-x-1/2 bottom-[32%]"
              width="180"
              height="70"
              viewBox="0 0 180 70"
            >
              {Array.from({ length: 38 }).map((_, i) => {
                const x = 90 + (Math.sin(i * 1.7) * 70);
                const y = 10 + (Math.abs(Math.cos(i * 1.3)) * 55);
                const r = 0.6 + ((i * 13) % 7) / 7 * 1.6;
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={r}
                    fill={i % 3 === 0 ? SILVER_BRIGHT : SAPPHIRE_LIGHT}
                    opacity={0.4 + ((i * 7) % 6) / 10}
                  />
                );
              })}
            </svg>
          </motion.div>

          {/* Envelope flap */}
          <motion.div
            className="absolute top-0 left-0 right-0 origin-top"
            style={{ perspective: "800px" }}
            animate={isOpening ? { rotateX: -180 } : {}}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          >
            <div
              className="w-full overflow-hidden rounded-t-md"
              style={{
                height: "120px",
                transformStyle: "preserve-3d",
              }}
            >
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 360 120"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="flapGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1a2033" />
                    <stop offset="100%" stopColor="#0a0e1a" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,0 L360,0 L180,120 Z"
                  fill="url(#flapGrad)"
                  stroke="rgba(154,164,181,0.25)"
                  strokeWidth="1"
                />
              </svg>
            </div>
          </motion.div>
        </div>

        {/* Couple name + CTA */}
        <motion.div
          className="text-center mt-2"
          animate={isOpening ? { opacity: 0, y: 20 } : {}}
          transition={{ duration: 0.3 }}
        >
          <h1
            className="font-serif text-3xl sm:text-4xl md:text-5xl mb-3 tracking-wide"
            style={{
              background:
                "linear-gradient(180deg, #eef2fa 0%, #aeb8cc 45%, #6a7590 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "0 2px 20px rgba(59,91,181,0.2)",
            }}
          >
            Tosin &amp; Pelumi
          </h1>
          <p
            className="text-xs sm:text-sm uppercase font-sans"
            style={{
              color: SILVER_MID,
              letterSpacing: "0.4em",
            }}
          >
            Tap to open your invitation
          </p>
        </motion.div>
      </div>

      {/* Sparkle icon bottom-right */}
      <svg
        className="absolute bottom-8 right-8 sm:bottom-14 sm:right-14 pointer-events-none"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z"
          fill={SILVER_BRIGHT}
          opacity="0.85"
        />
      </svg>

      {/* Fade out overlay */}
      <AnimatePresence>
        {isOpening && (
          <motion.div
            className="absolute inset-0 z-50"
            style={{ background: "#04060b" }}
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
