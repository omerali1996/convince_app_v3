import React, { useEffect, useRef } from "react";
import { GameProvider, useGame } from "./context/GameContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import WelcomeScreen from "./components/WelcomeScreen";
import ScenariosScreen from "./components/ScenarioScreen";
import GameScreen from "./components/GameScreen";
import { AnimatePresence, motion } from "framer-motion";

const variants = {
  initial: { x: 40, opacity: 0 },
  enter: { x: 0, opacity: 1, transition: { duration: 0.35, ease: "easeOut" } },
  exit: { x: -40, opacity: 0, transition: { duration: 0.25, ease: "easeIn" } },
};

function ScreenSwitcher() {
  const { screen, setScreen, fetchScenarios, startGame } = useGame();
  const { user, checking } = useAuth();
  const didAutoRouteRef = useRef(false);

  // Google ile giriş başarıyla tamamlandığında otomatik senaryo ekranına yönlendir
  useEffect(() => {
    if (checking) return;
    if (didAutoRouteRef.current) return;

    if (user && screen === "welcome") {
      didAutoRouteRef.current = true;
      (async () => {
        await fetchScenarios();
        startGame(); // "scenarios"
      })();
    }
  }, [user, checking, screen, fetchScenarios, startGame]);

  const render = () => {
    if (screen === "welcome") return <WelcomeScreen />;
    if (screen === "scenarios") return <ScenariosScreen />;
    if (screen === "game") return <GameScreen />;
    return null;
  };

  return (
    <div style={rootWrap}>
      <div className="container">
        <div style={topRow}>
          <div style={topBadge}>
            {checking
              ? "Giriş durumunuz kontrol ediliyor..."
              : user
              ? `👋 ${user.name}`
              : "Misafir"}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={screen + (checking ? "-checking" : "-ready")}
            variants={variants}
            initial="initial"
            animate="enter"
            exit="exit"
            style={{ minHeight: "520px", display: "flex", flexDirection: "column" }}
          >
            {render()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

const rootWrap = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
};

const topRow = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 8,
};

const topBadge = {
  fontSize: 13,
  opacity: 0.85,
  background: "#172044",
  color: "var(--accent)",
  border: "1px solid rgba(255,255,255,.06)",
  padding: "6px 10px",
  borderRadius: 999,
  fontWeight: 600,
  letterSpacing: ".2px",
};

export default function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <ScreenSwitcher />
      </GameProvider>
    </AuthProvider>
  );
}
