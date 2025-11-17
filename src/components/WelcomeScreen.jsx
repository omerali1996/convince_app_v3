// "use client"; // Next.js kullanıyorsan aç

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "../context/GameContext";
import { useAuth } from "../context/AuthContext";
import { BACKEND_URL } from "../api";

export default function WelcomeScreen() {
  const { startGame, fetchScenarios } = useGame();
  const { user, checking } = useAuth();

  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showButton, setShowButton] = useState(false);

  // 🔊 Tek Audio + sabit aralıklı tetikleme
  const keyAudioRef = useRef(null);
  const nextTickRef = useRef(0);
  const CLICK_INTERVAL = 180; // ms

  // ⏱️ Yazım zamanlayıcıları
  const startTimeoutRef = useRef(null);
  const typingIntervalRef = useRef(null);

  const fullText = `Hoş geldin.
Hayat, her gün sayısız küçük müzakerenin içinde geçiyor.
Kimi zaman bir arkadaşla, kimi zaman bir iş toplantısında, kimi zaman da kendinle.
Bu oyun, sadece ne söylediğini değil, neden öyle davrandığını anlaman için tasarlandı.
Gerçek hayattan alınan senaryolarda, sınır koyma, ikna etme ve duygu yönetimi becerilerini sınayacaksın.
Her seçim, farkındalığının bir yansıması.
Her senaryo, iletişim tarzını güçlendirmen için bir meydan okuma.
Burada amaç sadece kendini tanımak değil — daha stratejik, daha etkili, daha güçlü bir müzakereci olmak.
Hazırsan, oyun başlasın. 🧠💥`;

  const playKeySound = () => {
    const a = keyAudioRef.current;
    if (!a) return;
    const now = performance.now();
    if (now < nextTickRef.current) return;
    if (!a.paused) return;
    try {
      a.volume = 0.06;
      a.playbackRate = 1.0;
      a.currentTime = 0;
      a.play().catch(() => {});
      nextTickRef.current = now + CLICK_INTERVAL;
    } catch {}
  };

  const stopKeySound = () => {
    const a = keyAudioRef.current;
    if (!a) return;
    try {
      a.pause();
      a.currentTime = 0;
    } catch {}
  };

  const handleSkip = () => {
    if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    stopKeySound();
    setDisplayedText(fullText);
    setIsTyping(false);
    setShowButton(true);
  };

  useEffect(() => {
    keyAudioRef.current = new Audio("/sounds/mechanical-key.mp3");
    keyAudioRef.current.preload = "auto";
    keyAudioRef.current.loop = false;

    startTimeoutRef.current = setTimeout(() => {
      setIsTyping(true);
      let index = 0;

      typingIntervalRef.current = setInterval(() => {
        if (index < fullText.length) {
          setDisplayedText(fullText.slice(0, index + 1));
          const ch = fullText[index];
          if (ch.trim() !== "" && ch !== "\n") playKeySound();
          index++;
        } else {
          setIsTyping(false);
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
          stopKeySound();
          setTimeout(() => setShowButton(true), 500);
        }
      }, 50);
    }, 1200);

    return () => {
      if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      stopKeySound();
      keyAudioRef.current = null;
    };
  }, []);

  // ✅ Google ile giriş tamamlanınca otomatik → senaryolar + scenarios screen
  useEffect(() => {
    const goIfLoggedIn = async () => {
      if (!checking && user) {
        try {
          await fetchScenarios();
        } finally {
          startGame();
        }
      }
    };
    goIfLoggedIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, checking]);

  // 👤 Misafir akışı: önce senaryoları çek → sonra scenarios
  const handleGuestStart = async () => {
    stopKeySound();
    try {
      await fetchScenarios();
    } finally {
      startGame();
    }
  };

  const loginWithGoogle = () => {
    window.location.href = `${BACKEND_URL}/api/auth/login/google`;
  };

  // CTA animasyon variant'ları (alttan kayarak)
  const ctaParent = {
    initial: { opacity: 0, y: 30 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: "easeOut", when: "beforeChildren", staggerChildren: 0.1 },
    },
  };

  const ctaItem = {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  };

  return (
    <div className="ws-wrap" style={wrap}>
      <style>{responsiveStyles}</style>

      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="ws-card"
        style={card}
      >
        {isTyping && (
          <button
            onClick={handleSkip}
            className="ws-skipBtn"
            style={skipBtn}
            title="Yazıyı atla"
          >
            Skip ›
          </button>
        )}

        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
          style={title}
        >
          Müzakere.0
        </motion.h1>

        {/* Bilgilendirme */}
        <div style={tinyInfo}>
          {checking
            ? "Giriş doğrulanıyor…"
            : user
            ? `👋 ${user.name} ile devam ediliyor…`
            : "Devam etmek için bir yol seçin"}
        </div>

        <div className="ws-textContainer" style={textContainer}>
          <div className="ws-subtitle" style={subtitle}>
            {displayedText}
            {isTyping && <span style={cursor}>|</span>}
          </div>
        </div>

        {/* CTA Butonları: alt alta + alttan kayarak */}
        <AnimatePresence>
          {showButton && !user && !checking && (
            <motion.div
              variants={ctaParent}
              initial="initial"
              animate="animate"
              style={ctaCol}
            >
              <motion.button
                variants={ctaItem}
                onClick={loginWithGoogle}
                style={googleBtn}
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google"
                  width={18}
                  height={18}
                  style={{ marginRight: 10 }}
                />
                Google ile Giriş Yap
              </motion.button>

              <motion.div variants={ctaItem} style={divider}>
                <span style={dividerLine} />
                <span style={dividerText}>veya</span>
                <span style={dividerLine} />
              </motion.div>

              <motion.button
                variants={ctaItem}
                onClick={handleGuestStart}
                style={guestBtn}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                Misafir Oyna
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/* ---------- Responsive Styles ---------- */
const responsiveStyles = `
  @media (max-width: 768px) {
    .ws-wrap { padding: 10px !important; }

    .ws-card {
      max-width: 100% !important;
      width: 100% !important;
      padding: 28px 14px 56px !important;
      border-radius: 16px !important;
    }

    .ws-subtitle {
      font-size: 15px !important;
      line-height: 1.65 !important;
      min-height: 44vh !important;
      letter-spacing: 0.1px !important;
    }

    .ws-textContainer { margin-bottom: 22px !important; }

    .ws-skipBtn {
      bottom: 8px !important;
      right: 8px !important;
      padding: 6px 10px !important;
      font-size: 12px !important;
    }
  }

  @media (max-width: 420px) {
    .ws-card {
      padding: 24px 10px 52px !important;
    }
    .ws-subtitle {
      font-size: 14px !important;
      line-height: 1.6 !important;
      min-height: 40vh !important;
    }
  }
`;

const wrap = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  background: "radial-gradient(circle at center, #0f162f, #0a0f1f)",
  padding: "20px",
};

const card = {
  textAlign: "center",
  padding: "40px 32px",
  background: "rgba(15, 22, 47, 0.95)",
  borderRadius: 20,
  border: "1px solid rgba(255,255,255,.06)",
  boxShadow: "0 8px 24px rgba(0,0,0,.4)",
  maxWidth: 600,
  width: "90%",
  backdropFilter: "blur(10px)",
  position: "relative",
};

const skipBtn = {
  position: "absolute",
  bottom: 12,
  right: 12,
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.25)",
  color: "rgba(255,255,255,0.85)",
  padding: "6px 10px",
  borderRadius: 10,
  cursor: "pointer",
  fontSize: 12,
  letterSpacing: "0.3px",
  transition: "all .2s ease",
  zIndex: 2,
};

const title = {
  fontSize: 32,
  marginBottom: 12,
  color: "#fff",
  fontWeight: 600,
  letterSpacing: "0.5px",
};

const tinyInfo = {
  fontSize: 13,
  opacity: 0.8,
  marginBottom: 10,
};

const textContainer = { marginBottom: 28 };

const subtitle = {
  fontSize: 16,
  color: "rgba(255,255,255,0.85)",
  lineHeight: 1.8,
  minHeight: 320,
  textAlign: "left",
  whiteSpace: "pre-wrap",
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const ctaCol = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  marginTop: 4,
};

const googleBtn = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,.14)",
  background: "linear-gradient(180deg, #18224a, #121a34)",
  color: "#eaf0ff",
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
  boxShadow: "0 6px 18px rgba(0,0,0,.25)",
};

const divider = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  margin: "4px 0 2px",
  opacity: 0.8,
};

const dividerLine = {
  height: 1,
  flex: 1,
  background: "rgba(255,255,255,0.12)",
};

const dividerText = {
  fontSize: 12,
  letterSpacing: "0.3px",
  color: "rgba(255,255,255,0.7)",
  textTransform: "uppercase",
};

const guestBtn = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "0",
  background: "linear-gradient(135deg, #ffbe5c, #ff9d4c)",
  color: "#1a1a1a",
  fontWeight: 800,
  fontSize: 16,
  cursor: "pointer",
  boxShadow: "0 6px 18px rgba(255, 190, 92, 0.25)",
  letterSpacing: "0.4px",
};

const cursor = {
  display: "inline-block",
  width: "2px",
  height: "1.2em",
  backgroundColor: "#ffbe5c",
  marginLeft: "2px",
  animation: "blink 1s infinite",
  verticalAlign: "middle",
};

if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes blink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0; }
    }

    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
  `;
  if (!document.head.querySelector('[data-welcome-styles]')) {
    styleSheet.setAttribute("data-welcome-styles", "true");
    document.head.appendChild(styleSheet);
  }
}
