import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

export default function ForumHeader({ forum, userRole, onProfilePictureUpdate }) {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);

    const isAdmin = userRole && ["SA", "CP"].includes(userRole);

    const handleProfilePictureUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append("profile_picture", file);

            await api.patch(`/forums/${forum.id}/about/info/`, formData);

            // Callback to refresh forum data
            if (onProfilePictureUpdate) {
                onProfilePictureUpdate();
            }
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
        <div className="w-full bg-white border-b border-gray-200 p-4 md:p-6">
            <div className="flex items-start gap-4">
                {/* Profile Picture Section - Vertical Stack */}
                <div className="flex flex-col items-center gap-2">
                    {/* Forum Profile Picture with Camera Icon */}
                    <div className="relative w-14 h-14 md:w-16 md:h-16 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {forum?.profile_picture ? (
                            <img
                                src={forum.profile_picture}
                                alt={forum.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-xl md:text-2xl font-bold text-primary">
                                {forum?.name?.charAt(0)?.toUpperCase()}
                            </span>
                        )}

                        {/* Camera Icon Overlay */}
                        {isAdmin && (
                            <>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer disabled:opacity-50"
                                    title="Click to upload profile picture"
                                >
                                    <span className="text-white text-lg">📷</span>
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleProfilePictureUpload}
                                    className="hidden"
                                />
                            </>
                        )}
                    </div>

                    {/* Back Arrow - Below Profile Picture */}
                    <button
                        onClick={() => navigate("/dashboard")}
                        className="text-primary font-medium text-xs md:text-sm hover:underline flex items-center gap-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.293 16.293a1 1 0 010 1.414l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L8.414 10l5.293 5.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                        Back
                    </button>
                </div>

                {/* Forum Info */}
                <div className="flex-1 min-w-0">
                    {/* Forum Name + Verification Badge */}
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg md:text-2xl font-bold text-primary truncate">
                            {forum?.name}
                        </h1>
                        {/* Verification Badge */}
                        {forum?.is_verified && (
                            <div className="flex-shrink-0 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                                ✓
                            </div>
                        )}
                    </div>

                    {/* Forum Slogan & Motto */}
                    {(forum?.slogan || forum?.motto) && (
                        <div className="mt-1">
                            {forum?.slogan && (
                                <p className="text-xs md:text-sm text-gray-700 font-semibold">
                                    {forum.slogan}
                                </p>
                            )}
                            {forum?.motto && (
                                <p className="text-xs md:text-sm text-gray-600 italic mt-1">
                                    "{forum.motto}"
                                </p>
                            )}
                        </div>
                    )}

                    {/* Description */}
                    <p className="text-sm md:text-base text-gray-700 mt-2 line-clamp-2">
                        {forum?.description || "No description"}
                    </p>
                </div>
            </div>
        </div>
    );
}
