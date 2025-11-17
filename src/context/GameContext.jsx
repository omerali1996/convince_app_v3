import React, { createContext, useContext, useState } from "react";
import api from "../api";

const GameContext = createContext();

export function GameProvider({ children }) {
  const [screen, setScreen] = useState("welcome"); // welcome | scenarios | game
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentScenario, setCurrentScenario] = useState(null);

  const startGame = () => setScreen("scenarios");

  const fetchScenarios = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/api/scenarios");
      setScenarios(res.data || []);
    } catch (e) {
      console.error(e);
      setError("Senaryolar yüklenemedi.");
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
