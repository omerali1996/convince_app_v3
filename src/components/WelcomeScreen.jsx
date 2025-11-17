// WelcomeScreen.jsx
// "use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useGame } from "../context/GameContext";
import { useAuth } from "../context/AuthContext";
import { BACKEND_URL } from "../api";

export default function WelcomeScreen() {
  const { startGuestGame } = useGame();  // 🔥 misafir için yeni fonksiyon
  const { user, checking, logout } = useAuth();

  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showButtonGroup, setShowButtonGroup] = useState(false);

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
    setShowButtonGroup(true);
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

          // 🔥 Yazı bitince butonlar alttan kayarak gelir
          setTimeout(() => setShowButtonGroup(true), 700);
        }
      }, 50);
    }, 1200);

    return () => {
      clearTimeout(startTimeoutRef.current);
      clearInterval(typingIntervalRef.current);
      stopKeySound();
    };
  }, []);

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
        className="ws-card card"
        style={card}
      >
        {isTyping && (
          <button onClick={handleSkip} className="ws-skipBtn btn btn-secondary" style={skipBtn}>
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

        {/* --- AUTH BAR --- */}
        <div style={authBar}>
          {checking ? (
            <span style={{ opacity: 0.85 }}>Giriş doğrulanıyor…</span>
          ) : user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {user.picture && (
                <img
                  src={user.picture}
                  alt="pp"
                  width={28}
                  height={28}
                  style={{ borderRadius: "50%" }}
                />
              )}
              <span style={{ fontWeight: 600 }}>{user.name}</span>
              <button onClick={logout} className="btn btn-secondary">
                Çıkış
              </button>
            </div>
          ) : (
            <>
              {/* --- Google + Misafir butonları --- */}
              {showButtonGroup && (
                <motion.div
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  style={stackButtons}
                >
                  {/* Google */}
                  <button onClick={loginWithGoogle} className="btn btn-secondary" style={stackBtnItem}>
                    <img
                      src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                      alt="Google"
                      width={16}
                      height={16}
                      style={{ marginRight: 8 }}
                    />
                    Google ile giriş yap
                  </button>

                  {/* 🔥 Misafir Oyna aynı stil */}
                  <button onClick={startGuestGame} className="btn btn-secondary" style={stackBtnItem}>
                    <img
                      src="https://cdn-icons-png.flaticon.com/512/456/456212.png"
                      alt="Guest"
                      width={16}
                      height={16}
                      style={{ marginRight: 8, opacity: 0.8 }}
                    />
                    Misafir Oyna
                  </button>
                </motion.div>
              )}
            </>
          )}
        </div>

        <div className="ws-textContainer" style={textContainer}>
          <div className="ws-subtitle" style={subtitle}>
            {displayedText}
            {isTyping && <span style={cursor}>|</span>}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ---------- Responsive Styles ---------- */
const responsiveStyles = `
  @media (max-width: 768px) {
    .ws-wrap { padding: 10px !important; }
    .ws-card { max-width: 100% !important; width: 100% !important; padding: 28px 14px 56px !important; border-radius: 16px !important; }
    .ws-subtitle { font-size: 15px !important; line-height: 1.65 !important; min-height: 44vh !important; }
    .ws-startBtn { width: 100% !important; font-size: 16px !important; padding: 12px 14px !important; }
    .ws-skipBtn { bottom: 8px !important; right: 8px !important; padding: 6px 10px !important; font-size: 12px !important; }
  }
`;

const wrap = { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "20px" };

const card = {
  textAlign: "center",
  padding: "40px 32px",
  background: "var(--card)",
  borderRadius: 20,
  border: "1px solid rgba(255,255,255,.06)",
  boxShadow: "0 8px 24px rgba(0,0,0,.35)",
  maxWidth: 600,
  width: "90%",
  backdropFilter: "blur(6px)",
  position: "relative",
};

const skipBtn = {
  position: "absolute",
  bottom: 12,
  right: 12,
  borderRadius: 10,
  fontSize: 12,
};

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
  width: "100%",
};

const stackButtons = { display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 360 };
const stackBtnItem = { width: "100%", justifyContent: "center", display: "flex", alignItems: "center" };

const textContainer = { marginBottom: 32 };
const subtitle = {
  fontSize: 16,
  lineHeight: 1.8,
  minHeight: 360,
  textAlign: "left",
  whiteSpace: "pre-wrap",
};
const cursor = {
  display: "inline-block",
  width: "2px",
  height: "1.2em",
  backgroundColor: "var(--accent)",
  marginLeft: "2px",
  animation: "blink 1s infinite",
};
const title = { fontSize: 32, marginBottom: 24, fontWeight: 600, letterSpacing: "0.5px" };
