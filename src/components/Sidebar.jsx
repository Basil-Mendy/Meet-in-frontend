import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { NotificationBadge } from "./notifications/NotificationBadges";

export default function Sidebar({ activeForum, onSelectForum }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useContext(AuthContext);
  const { unreadCounts, fetchUnreadCounts } = useNotifications();
  const [forums, setForums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("auth/profile/");
        setProfile(res.data);
      } catch (err) {
        console.error("Failed to load profile");
      }
    };

    fetchProfile();
  }, [isAuthenticated]);

  useEffect(() => {
    const fetchForums = async () => {
      try {
        setLoading(true);
        const res = await api.get("forums/my-forums/");
        setForums(res.data);
      } catch (err) {
        setError("Failed to load forums");
      } finally {
        setLoading(false);
      }
    };

    fetchForums();
  }, [isAuthenticated]);

  // Fetch notification counts when sidebar loads
  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCounts();
    }
  }, [isAuthenticated, fetchUnreadCounts]);

  const handleProfileClick = () => {
    navigate("/user-profile");
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  // Filter forums based on search
  const filteredForums = forums.filter((forum) =>
    forum.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (forum.description && forum.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="hidden md:flex md:w-72 bg-primary text-white flex-col sticky top-0 h-screen">
      {/* Header with App Name, Search, Profile, and Logout */}
      <div className="p-4 border-b border-white/10">
        <input
          type="text"
          placeholder="Search forums..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/30 placeholder-white/50"
        />
      </div>

      {/* Forum List */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <p className="p-4 text-sm text-white/70">Loading forums…</p>
        )}

        {error && (
          <p className="p-4 text-sm text-red-400">{error}</p>
        )}

        {!loading && forums.length === 0 && (
          <p className="p-4 text-sm text-blue-300">
            You are not in any forum yet.
          </p>
        )}

        {!loading && forums.length > 0 && filteredForums.length === 0 && (
          <p className="p-4 text-sm text-blue-300">
            No forums match your search.
          </p>
        )}

        {filteredForums.map((forum) => {
          const forumNotificationCount = unreadCounts.forums[forum.id] || 0;

          return (
            <button
              key={forum.id}
              onClick={() => {
                if (onSelectForum) {
                  onSelectForum(forum.id);
                } else {
                  navigate(`/forum/${forum.id}`);
                }
              }}
              className={`w-full text-left px-4 py-3 border-b border-white/10 transition flex items-center gap-3 hover:bg-white/10 ${activeForum === forum.id ? "bg-white/10" : ""
                }`}
            >
              {/* Forum Profile Picture */}
              <div className="w-12 h-12 rounded-full bg-white/10 flex-shrink-0 flex items-center justify-center text-white font-bold overflow-hidden">
                {forum.profile_picture ? (
                  <img
                    src={forum.profile_picture}
                    alt={forum.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='100%25' height='100%25' fill='%23E5E7EB'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23717171' font-size='48'>?</text></svg>";
                    }}
                  />
                ) : (
                  <span>{forum.name.charAt(0).toUpperCase()}</span>
                )}
              </div>

              {/* Forum Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{forum.name}</p>
                <p className="text-xs text-blue-300 truncate">
                  {forumNotificationCount > 0
                    ? `${forumNotificationCount} new update${forumNotificationCount > 1 ? "s" : ""
                    }`
                    : "No new updates"}
                </p>
              </div>

              {/* Notification Badge */}
              {forumNotificationCount > 0 && (
                <NotificationBadge count={forumNotificationCount} />
              )}
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-white/10 space-y-2">
        <button
          onClick={() => navigate("/create-forum")}
          className="w-full bg-blue-700 py-2 rounded-lg text-sm font-medium hover:bg-blue-400 transition"
        >
          + Create Forum
        </button>

        <button
          onClick={() => navigate("/join-forum")}
          className="w-full bg-blue-700 py-2 rounded-lg text-sm font-medium hover:bg-blue-400 transition"
        >
          Join Forum
        </button>

        <button
          className="w-full bg-red-600 py-2 rounded-lg text-sm font-medium hover:bg-red-400 transition"
          onClick={() => {
            localStorage.clear();
            window.location.href = "/";
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
