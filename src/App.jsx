// App.jsx
import React, { useEffect } from "react";
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
  const { screen, setScreen } = useGame();
  const { user, checking } = useAuth();

  // Google ile giriş → Welcome ekranında isek → otomatik senaryolara geç
  useEffect(() => {
    if (!checking && user && screen === "welcome") {
      setScreen("scenarios");
    }
  }, [checking, user, screen, setScreen]);

  const render = () => {
    if (screen === "welcome") return <WelcomeScreen />;
    if (screen === "scenarios") return <ScenariosScreen />;
    if (screen === "game") return <GameScreen />;
    return null;
  };

  return (
    <motion.div
      key={screen}
      variants={variants}
      initial="initial"
      animate="enter"
      exit="exit"
      style={{ width: "100%" }}
    >
      {render()}
    </motion.div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <AnimatePresence mode="wait">
          <ScreenSwitcher />
        </AnimatePresence>
      </GameProvider>
    </AuthProvider>
  );
}
