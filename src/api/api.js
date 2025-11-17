import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "https://convince-app-v2-1.onrender.com",
  timeout: 10000,
});

export const fetchScenarios = () => API.get("/scenarios");
export const askQuestion = (scenarioIndex, question) => 
  API.post("/ask", { scenarioIndex, question });

