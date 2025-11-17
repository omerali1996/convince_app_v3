import React, { createContext, useContext, useState, useCallback } from "react";
import api from "../api";

const GameContext = createContext();

export function GameProvider({ children }) {
  const [screen, setScreen] = useState("welcome"); // welcome | scenarios | game
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentScenario, setCurrentScenario] = useState(null);

  const startGame = useCallback(() => setScreen("scenarios"), []);

  const fetchScenarios = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1) Normal (auth'lu) dene
      const res = await api.get("/api/scenarios");
      setScenarios(res.data || []);
      return true;
    } catch (e) {
      // 2) 401/403 ise misafir/public fallback dene
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        try {
          const pub = await api.get("/api/scenarios");
          setScenarios(pub.data || []);
          return true;
        } catch (e2) {
          console.error("Public fetch failed:", e2);
          setError("Senaryolar yüklenemedi.");
          setScenarios([]);
          return false;
        }
      }
      console.error("Scenarios fetch failed:", e);
      setError("Senaryolar yüklenemedi.");
      setScenarios([]);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const selectScenario = useCallback((scenario) => {
    setCurrentScenario(scenario);
    setScreen("game");
  }, []);

  const exitGame = useCallback(() => {
    setCurrentScenario(null);
    setScreen("scenarios");
  }, []);

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
        setError,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);

