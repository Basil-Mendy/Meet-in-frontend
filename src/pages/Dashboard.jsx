import { useEffect, useState, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import MobileProfilePanel from "../components/MobileProfilePanel";
import UserProfile from "./UserProfile";
import ForumDetail from "./ForumDetail";
import ForumNotificationBadge from "../components/notifications/ForumNotificationBadge";

export default function Dashboard() {
  const { isAuthenticated } = useContext(AuthContext);
  const [forums, setForums] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [profileComplete, setProfileComplete] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [showMobileProfile, setShowMobileProfile] = useState(false);
  const [selectedForumId, setSelectedForumId] = useState(null);
  const navigate = useNavigate();
  const { forumId } = useParams();

  // 🔐 Check profile completion status
  useEffect(() => {
    const fetchProfileStatus = async () => {
      try {
        const res = await api.get("auth/profile/");
        setProfileComplete(res.data.is_completed);
      } catch (err) {
        console.error("Failed to fetch profile status");
      }
    };

    if (isAuthenticated) {
      fetchProfileStatus();
    }
  }, [isAuthenticated]);

  // Fetch forums for mobile list
  useEffect(() => {
    const fetchForums = async () => {
      try {
        const res = await api.get("forums/my-forums/");
        setForums(res.data);
      } catch (err) {
        console.error("Failed to fetch forums");
      }
    };

    if (isAuthenticated) {
      fetchForums();
    }
  }, [isAuthenticated]);

  // Sync selectedForumId from URL params
  useEffect(() => {
    if (forumId) {
      setSelectedForumId(forumId);
    }
  }, [forumId]);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Topbar (Mobile only) */}
      <Topbar onProfileClick={() => setShowMobileProfile(true)} />

      {/* Content area: Sidebar + Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Sidebar (Desktop only) */}
        <Sidebar onSelectForum={(id) => setSelectedForumId(id)} />

        {/* RIGHT: Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main Panel */}
          <div className="flex-1 overflow-y-auto bg-white">
            {/* Forum Detail View */}
            {selectedForumId ? (
              <ForumDetail forumId={selectedForumId} onBack={() => setSelectedForumId(null)} />
            ) : showProfile ? (
              <UserProfile />
            ) : (
              <>
                {/* ⚠️ PROFILE COMPLETION CTA */}
                {!profileComplete && (
                  <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
                    <div className="max-w-5xl mx-auto flex items-center justify-between">
                      <p className="text-sm font-medium text-yellow-900">
                        Complete your profile to create and join forums.
                      </p>
                      <button
                        onClick={() => navigate("/complete-profile")}
                        className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-yellow-700 transition"
                      >
                        Complete Profile
                      </button>
                    </div>
                  </div>
                )}

                {/* MOBILE: Forum list full-screen */}
                <div className="md:hidden">
                  <div className="p-4 pb-24">
                    {/* Search Bar */}
                    <div className="mb-4">
                      <input
                        type="text"
                        placeholder="Search forums..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <h2 className="text-lg font-semibold text-secondary mb-4">Forums</h2>

                    {forums.length === 0 ? (
                      <p className="text-sm text-gray-600">You are not in any forum yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {forums
                          .filter((f) =>
                            f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (f.description && f.description.toLowerCase().includes(searchQuery.toLowerCase()))
                          )
                          .map((f) => (
                            <button
                              key={f.id}
                              onClick={() => navigate(`/forum/${f.id}`)}
                              className="w-full text-left p-3 bg-white border rounded-lg shadow-sm flex items-center gap-3 hover:bg-gray-50 transition"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                  {f.profile_picture ? (
                                    <img src={f.profile_picture} alt={f.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-lg font-bold">{f.name?.charAt(0)?.toUpperCase()}</span>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{f.name}</p>
                                  <p className="text-xs text-gray-500 truncate">{f.description || 'No description'}</p>
                                </div>
                              </div>

                              <div className="flex-shrink-0 ml-2">
                                <ForumNotificationBadge forumId={f.id} />
                              </div>
                            </button>
                          ))}
                      </div>
                    )}

                    {/* Mobile action buttons */}
                    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 space-y-2 md:hidden">
                      <button
                        onClick={() => navigate("/create-forum")}
                        className="w-full bg-secondary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent transition"
                      >
                        + Create Forum
                      </button>
                      <button
                        onClick={() => navigate("/join-forum")}
                        className="w-full bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-900 transition"
                      >
                        Join Forum
                      </button>
                      <button
                        onClick={() => {
                          localStorage.clear();
                          window.location.href = "/";
                        }}
                        className="w-full bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
                {/* DESKTOP */}
                <div className="hidden md:block">
                  <div className="max-w-3xl mx-auto p-4 md:p-6">
                    <div className="flex gap-3 mb-6">
                      <button
                        onClick={() => navigate("/create-forum")}
                        className="bg-secondary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent transition"
                      >
                        + Create Forum
                      </button>
                      <button
                        onClick={() => navigate("/join-forum")}
                        className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent transition"
                      >
                        Join Forum
                      </button>
                    </div>

                    <h2 className="text-lg font-semibold text-secondary mb-4">Community Feed</h2>

                    <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                      <p className="font-medium">Welcome to MEET-IN 🎉</p>
                      <p className="text-sm text-gray-600 mt-1">Select a forum on the left to view its content, or create a new forum to get started.</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Profile Panel */}
      <MobileProfilePanel
        isOpen={showMobileProfile}
        onClose={() => setShowMobileProfile(false)}
      />
    </div>
  );
}
