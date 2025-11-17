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

  const fetchScenarios = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1) Normal istek (token varsa interceptor ekler)
      const res = await api.get("/api/scenarios");
      setScenarios(res.data || []);
    } catch (e1) {
      // 2) Misafir fallback: token/credential olmadan public dene
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
        console.error("Scenarios fetch failed:", e1?.message || e1, e2?.message || e2);
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
        scenarios,
        loading,
        error,
        currentScenario,
        startGame,
        fetchScenarios,
        selectScenario,
        exitGame,
        setScreen,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);
