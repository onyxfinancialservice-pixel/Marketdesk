// Backend API wrapper
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
export const API = `${BACKEND_URL}/api`;

export const apiClient = axios.create({
  baseURL: API,
  timeout: 60000,
});

export async function analyzeAsset(payload) {
  const { data } = await apiClient.post("/analyze", payload);
  return data;
}

export async function chatWithAI(payload) {
  const { data } = await apiClient.post("/chat", payload);
  return data;
}

export async function runPBMBrain(payload) {
  const { data } = await apiClient.post("/brain/analyze", payload);
  return data;
}
