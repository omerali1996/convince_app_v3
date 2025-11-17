import React from "react";
import { GameProvider, useGame } from "./context/GameContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import WelcomeScreen from "./components/WelcomeScreen";
import ScenariosScreen from "./components/ScenarioScreen";
import GameScreen from "./components/GameScreen";
import { AnimatePresence, motion } from "framer-motion";

const variants = {
  initial: { x: 40, opacity: 0 },
  enter: { x: 0, opacity: 1, transition: { duration: .35, ease: "easeOut" } },
  exit: { x: -40, opacity: 0, transition: { duration: .25, ease: "easeIn" } }
};

function ScreenSwitcher() {
  const { screen } = useGame();
  const { user, checking } = useAuth();

  const render = () => {
    if (screen === "welcome") return <WelcomeScreen />;
    if (screen === "scenarios") return <ScenariosScreen />;
    if (screen === "game") return <GameScreen />;
    return null;
  };

  return (
    <div style={rootWrap}>
      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 13, opacity: .85 }}>
            {checking ? "Giriş durumunuz kontrol ediliyor..." : user ? `👋 ${user.name}` : "Misafir"}
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
  padding: "24px"
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
