// "use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useGame } from "../context/GameContext";
import { useAuth } from "../context/AuthContext";
import { BACKEND_URL } from "../api";

export default function WelcomeScreen() {
  const { startGame } = useGame();
  const { user, checking, logout } = useAuth();

  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showButton, setShowButton] = useState(false);

  const keyAudioRef = useRef(null);
  const nextTickRef = useRef(0);
  const CLICK_INTERVAL = 180;

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
    clearTimeout(startTimeoutRef.current);
    clearInterval(typingIntervalRef.current);
    stopKeySound();
    setDisplayedText(fullText);
    setIsTyping(false);
    setShowButton(true);
  };

  useEffect(() => {
    keyAudioRef.current = new Audio("/sounds/mechanical-key.mp3");
    keyAudioRef.current.preload = "auto";

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
          clearInterval(typingIntervalRef.current);
          stopKeySound();
          setIsTyping(false);
          setTimeout(() => setShowButton(true), 500);
        }
      }, 50);
    }, 1200);

    return () => {
      clearTimeout(startTimeoutRef.current);
      clearInterval(typingIntervalRef.current);
      stopKeySound();
    };
  }, []);

  const handleStart = () => {
    stopKeySound();
    startGame();
  };

  const loginWithGoogle = () => {
    window.location.href = `${BACKEND_URL}/api/auth/login/google`;
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
          <button onClick={handleSkip} className="ws-skipBtn" style={skipBtn} title="Yazıyı atla">
            Skip &rsaquo;
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

        {/* --- AUTH BAR ADDED --- */}
        <div style={authBar}>
          {checking ? (
            <span style={{ opacity: 0.8 }}>Giriş doğrulanıyor…</span>
          ) : user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {user.picture && (
                <img src={user.picture} alt="pp" width={28} height={28} style={{ borderRadius: "50%" }} />
              )}
              <span style={{ fontWeight: 600 }}>{user.name}</span>
              <button onClick={logout} style={logoutBtn}>
                Çıkış
              </button>
            </div>
          ) : (
            <button onClick={loginWithGoogle} style={providerBtn}>
              <span style={{ fontSize: 18 }}>🟦</span>&nbsp; Google ile Giriş
            </button>
          )}
        </div>

        <div className="ws-textContainer" style={textContainer}>
          <div className="ws-subtitle" style={subtitle}>
            {displayedText}
            {isTyping && <span style={cursor}>|</span>}
          </div>
        </div>

        {showButton && (
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            onClick={handleStart}
            className="ws-startBtn"
            style={buttonStyle}
            whileHover={{ scale: 1.05, boxShadow: "0 6px 16px rgba(255, 190, 92, 0.3)" }}
            whileTap={{ scale: 0.95 }}
          >
            {user ? "Oynamaya Başla" : "Misafir Oyna"}
          </motion.button>
        )}
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
      padding: 28px 14px 48px !important;
      border-radius: 16px !important;
    }

    .ws-subtitle {
      font-size: 15px !important;
      line-height: 1.65 !important;
      min-height: 44vh !important;
      letter-spacing: 0.1px !important;
    }

    .ws-textContainer { margin-bottom: 22px !important; }

    .ws-startBtn {
      width: 100% !important;
      font-size: 16px !important;
      padding: 12px 14px !important;
    }

    .ws-skipBtn {
      bottom: 8px !important;
      right: 8px !important;
      padding: 6px 10px !important;
      font-size: 12px !important;
    }
  }

  @media (max-width: 420px) {
    .ws-card {
      padding: 24px 10px 44px !important;
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

/* --- ADDED AUTH BAR OLD STYLE LOOKING --- */
const authBar = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  padding: "10px 12px",
  borderRadius: 12,
  marginBottom: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
};

const providerBtn = {
  background: "#161d36",
  border: "1px solid rgba(255,255,255,.08)",
  color: "white",
  borderRadius: 10,
  padding: "10px 12px",
  cursor: "pointer",
  fontWeight: 600,
};

const logoutBtn = {
  background: "#2a354f",
  border: "1px solid rgba(255,255,255,.1)",
  borderRadius: 10,
  padding: "6px 10px",
  cursor: "pointer",
  color: "#eaf0ff",
  fontWeight: 600,
};

const textContainer = { marginBottom: 32 };

const subtitle = {
  fontSize: 16,
  color: "rgba(255,255,255,0.85)",
  lineHeight: 1.8,
  minHeight: 360,
  textAlign: "left",
  whiteSpace: "pre-wrap",
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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

const title = {
  fontSize: 32,
  marginBottom: 24,
  color: "#fff",
  fontWeight: 600,
  letterSpacing: "0.5px",
};

const buttonStyle = {
  background: "linear-gradient(135deg, #ffbe5c, #ff9d4c)",
  border: "none",
  color: "#1a1a1a",
  fontWeight: 700,
  padding: "14px 36px",
  borderRadius: 12,
  cursor: "pointer",
  fontSize: 17,
  boxShadow: "0 4px 12px rgba(255, 190, 92, 0.2)",
  transition: "all 0.2s ease",
  letterSpacing: "0.5px",
  textTransform: "uppercase",
};
