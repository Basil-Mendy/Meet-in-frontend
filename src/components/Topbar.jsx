import { useContext, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import api from "../api/axios";

export default function Topbar({ onProfileClick }) {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [uploading, setUploading] = useState(false);

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
  }, []);

  const handleProfileClick = () => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      onProfileClick?.();
    } else {
      navigate("/user-profile");
    }
  };

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("photo", file);

      await api.put("auth/profile/complete/", formData);

      // Refresh profile data
      const res = await api.get("auth/profile/");
      setProfile(res.data);
    } catch (err) {
      console.error("Failed to upload profile picture:", err);
      alert("Failed to upload profile picture");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="h-14 bg-primary text-white flex items-center px-4 justify-between sticky top-0 z-20">
      <div>
        <h1 className="text-xl font-bold">MEET-IN</h1>
        <p className="text-xs text-white/70">Your communities</p>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={logout}
          className="text-sm text-white/80 hover:text-white transition font-medium"
        >
          Logout
        </button>
        <button
          onClick={() => navigate('/user-wallet')}
          title="My Wallet"
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition"
        >
          💼
        </button>

        {/* Profile Icon Button */}
        <button
          onClick={handleProfileClick}
          title="My Profile"
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition"
        >
          👤
        </button>

        {/* Profile Picture with Camera Icon */}
        <div className="relative w-9 h-9 rounded-full border-2 border-white/20 flex-shrink-0 overflow-hidden flex items-center justify-center bg-white text-primary text-sm font-bold hover:border-white transition group">
          {profile?.photo ? (
            <img src={profile.photo} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            "👤"
          )}

          {/* Camera Icon Overlay */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:opacity-50"
            title="Click to upload profile picture"
          >
            <span className="text-white text-xs">📷</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleProfilePictureUpload}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}
