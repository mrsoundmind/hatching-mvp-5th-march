// CassAvatar — Cass (Brand Strategist) — Cool, composed, elegant, slick hair, rose-burgundy tones
import { motion } from "framer-motion";
import { AvatarWrapper, AvatarProps, eyeThinkingVariants } from "./BaseAvatar.js";

export default function CassAvatar({ state = "idle", size = 36, className = "" }: AvatarProps) {
  return (
    <AvatarWrapper state={state} size={size} className={className}>
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="cassBg" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fda4af" />
            <stop offset="100%" stopColor="#e11d48" />
          </radialGradient>
        </defs>

        {/* Background circle */}
        <circle cx="18" cy="18" r="18" fill="url(#cassBg)" />

        {/* Slick swept hair — smooth elegant shape */}
        <path
          d="M9 17 Q10 8 18 8 Q27 8 27 17 Q26 13 23 12.5 Q20 11.5 17 13 Q13 12 10 14 Q9 15 9 17Z"
          fill="#1a0814"
        />
        {/* Hair highlight */}
        <path
          d="M9 17 Q10 8 18 8 Q27 8 27 17 Q26 13 23 12.5 Q20 11.5 17 13 Q13 12 10 14 Q9 15 9 17Z"
          fill="white"
          opacity="0.12"
        />
        {/* Side swept part */}
        <path d="M9 17 Q8 14 10 11 Q12 8.5 14 8.5 Q11 9 9 13Z" fill="#1a0814" />
        {/* Elegant sweep detail */}
        <path d="M10 14 Q13 12 17 13" stroke="#2d1018" strokeWidth="0.6" fill="none" />

        {/* Neck */}
        <rect x="15" y="27" width="6" height="4" rx="1" fill="#f0c0c0" />

        {/* Face shadow */}
        <ellipse cx="18" cy="21.5" rx="9.5" ry="10.5" fill="#c09090" opacity="0.25" />

        {/* Face */}
        <ellipse cx="18" cy="21" rx="9" ry="10" fill="#f0c0c0" />

        {/* Eyes — confident, composed */}
        <motion.g animate={state} variants={eyeThinkingVariants}>
          {/* Left eye */}
          <circle cx="14" cy="20.5" r="2" fill="#1a0814" />
          <circle cx="14" cy="20.5" r="1.2" fill="#0d0008" />
          <circle cx="14.6" cy="20" r="0.55" fill="white" />
          {/* Right eye */}
          <circle cx="22" cy="20.5" r="2" fill="#1a0814" />
          <circle cx="22" cy="20.5" r="1.2" fill="#0d0008" />
          <circle cx="22.6" cy="20" r="0.55" fill="white" />
        </motion.g>

        {/* Elegant composed brows */}
        <motion.g
          animate={{ y: [0, -0.4, 0] }}
          transition={{ duration: 6, repeat: Infinity, delay: 3, ease: "easeInOut" }}
        >
          <path d="M12 18 Q14 16.8 15.5 17.5" stroke="#1a0814" strokeWidth="0.85" strokeLinecap="round" fill="none" />
          <path d="M20.5 17.5 Q22 16.8 24 18" stroke="#1a0814" strokeWidth="0.85" strokeLinecap="round" fill="none" />
        </motion.g>

        {/* Nose dots */}
        <ellipse cx="16.8" cy="22.5" rx="0.5" ry="0.4" fill="#c09090" opacity="0.5" />
        <ellipse cx="19.2" cy="22.5" rx="0.5" ry="0.4" fill="#c09090" opacity="0.5" />

        {/* Slight knowing half-smile */}
        <motion.g
          animate={{ scaleX: [1, 1.02, 1] }}
          transition={{ duration: 7, repeat: Infinity }}
          style={{ transformOrigin: "18px 26px" }}
        >
          <path
            d="M15 25.5 Q17 27 22 25"
            stroke="#1a0814"
            strokeWidth="1.1"
            strokeLinecap="round"
            fill="none"
          />
        </motion.g>

        {/* Subtle delicate nose line */}
        <path d="M17.5 22 Q18 23 18.5 22" stroke="#c49090" strokeWidth="0.6" strokeLinecap="round" fill="none" />
      </svg>
    </AvatarWrapper>
  );
}
