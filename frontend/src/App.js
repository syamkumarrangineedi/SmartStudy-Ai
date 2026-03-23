import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import TutorChat  from "./pages/TutorChat";
import Quiz       from "./pages/Quiz";
import Dashboard  from "./pages/Dashboard";
import Login      from "./pages/Login";
import "./App.css";

// Allow access if any studentId is set (including guest IDs)
function PrivateRoute({ children }) {
  return localStorage.getItem("studentId") ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"     element={<Login />} />
        <Route path="/"          element={<PrivateRoute><TutorChat /></PrivateRoute>} />
        <Route path="/quiz"      element={<PrivateRoute><Quiz /></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}