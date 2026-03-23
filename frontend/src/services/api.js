import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:8080/api" });

// AI — uses sessionKey = "studentId:sessionId"
export const askTutor = (question, sessionKey = "anonymous:default") =>
  API.get("/ai/tutor", { params: { question, sessionKey } });

export const getQuiz = (topic) =>
  API.get("/ai/quiz", { params: { topic } });

export const clearMemory = (sessionKey = "anonymous:default") =>
  API.delete("/ai/memory", { params: { sessionKey } });

// Documents — multi-file
export const uploadFiles = (formData) =>
  API.post("/document/upload", formData);

export const getDocumentStatus = () =>
  API.get("/document/status");

export const removeFile = (filename) =>
  API.delete("/document/remove", { params: { filename } });

export const clearDocument = () =>
  API.delete("/document/clear");

// Student
export const registerStudent = (name, password) =>
  API.post("/student/register", { name, password });

export const loginStudent = (name, password) =>
  API.post("/student/login", { name, password });

export const getProfile = (studentId) =>
  API.get("/student/profile/" + studentId);

export const saveQuizResult = (studentId, topic, correct, total) =>
  API.post("/student/quiz-result", { studentId, topic, correct, total });

export default API;