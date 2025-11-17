// context/GameContext.jsx
import React, { createContext, useContext, useState } from "react";
import api, { BACKEND_URL } from "../api";

const GameContext = createContext();

export function GameProvider({ children }) {
  const [screen, setScreen] = useState("welcome"); // welcome | scenarios | game
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentScenario, setCurrentScenario] = useState(null);

  const startGame = () => setScreen("scenarios");

  // 🔥 Misafir için tam çalışan fonksiyon
  const startGuestGame = async () => {
    await fetchScenarios();
    setScreen("scenarios");
  };

  const fetchScenarios = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.get("/api/scenarios");
      setScenarios(res.data || []);
    } catch (e1) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/scenarios`, {
          method: "GET",
          credentials: "omit",
          headers: { Accept: "application/json" },
        });

        if (!res.ok) throw new Error("Public fetch failed");

        const data = await res.json();
        setScenarios(data || []);
      } catch (e2) {
        console.error("Scenarios fetch failed:", e1, e2);
        setError("Senaryolar yüklenemedi.");
      }
    } finally {
      setLoading(false);
    }
  };

  const selectScenario = (scenario) => {
    setCurrentScenario(scenario);
    setScreen("game");
  };

  const exitGame = () => {
    setCurrentScenario(null);
    setScreen("scenarios");
  };

  return (
    <GameContext.Provider
      value={{
        screen,
        setScreen,
        scenarios,
        fetchScenarios,
        selectScenario,
        currentScenario,
        exitGame,
        startGame,
        startGuestGame, // 🔥 yeni fonksiyon
        loading,
        error,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);
