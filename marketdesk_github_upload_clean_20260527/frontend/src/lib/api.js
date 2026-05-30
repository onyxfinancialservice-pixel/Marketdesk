// Backend API wrapper
import axios from "axios";
import { supabase } from "@/lib/supabase";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
export const API = `${BACKEND_URL}/api`;

export const apiClient = axios.create({
  baseURL: API,
  timeout: 60000,
});

apiClient.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
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

export async function notifySocialPost(payload) {
  const { data } = await apiClient.post("/social/notify", payload);
  return data;
}

export async function getAccountStatus() {
  const { data } = await apiClient.get("/me");
  return data;
}
