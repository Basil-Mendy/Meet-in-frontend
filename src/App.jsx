import { useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import Login from "./auth/Login";
import Register from "./auth/Register";
import Dashboard from "./pages/Dashboard";
import CompleteProfile from "./pages/CompleteProfile";
import CreateForum from "./pages/CreateForum";
import JoinForum from "./pages/JoinForum";
import UserProfile from "./pages/UserProfile";
import UserWallet from "./pages/UserWallet";
import ForumDetail from "./pages/ForumDetail";

function AppRoutes() {
  const { isAuthenticated, loading } = useContext(AuthContext);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route
          path="/"
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />}
        />
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />}
        />
        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />}
        />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/complete-profile"
          element={isAuthenticated ? <CompleteProfile /> : <Navigate to="/login" />}
        />
        <Route
          path="/create-forum"
          element={isAuthenticated ? <CreateForum /> : <Navigate to="/login" />}
        />
        <Route
          path="/join-forum"
          element={isAuthenticated ? <JoinForum /> : <Navigate to="/login" />}
        />
        <Route
          path="/user-profile"
          element={isAuthenticated ? <UserProfile /> : <Navigate to="/login" />}
        />
        <Route
          path="/user-wallet"
          element={isAuthenticated ? <UserWallet /> : <Navigate to="/login" />}
        />
        <Route
          path="/forum/:forumId"
          element={isAuthenticated ? <ForumDetail /> : <Navigate to="/login" />}
        />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppRoutes />
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
