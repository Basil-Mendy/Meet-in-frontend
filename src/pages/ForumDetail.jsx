import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import { useNotifications } from "../context/NotificationContext";
import ForumHeader from "../components/forum/ForumHeader";
import ForumTabNav from "../components/forum/ForumTabNav";
import ForumFeed from "../components/forum/tabs/ForumFeed";
import ForumMeetings from "../components/forum/tabs/ForumMeetings";
import ForumPayments from "../components/forum/tabs/ForumPayments";
import ForumMembers from "../components/forum/tabs/ForumMembers";
import ForumAbout from "../components/forum/tabs/ForumAbout";
import ForumAnnouncements from "../components/forum/tabs/ForumAnnouncements";
import ForumPolls from "../components/forum/tabs/ForumPolls";
import ForumSettings from "../components/forum/tabs/ForumSettings";
import ForumDisbursement from "../components/forum/tabs/ForumDisbursement";

export default function ForumDetail({ forumId: propForumId, onBack }) {
    const navigate = useNavigate();
    const { forumId: urlForumId } = useParams();
    const { clearTabNotifications } = useNotifications();
    const [forum, setForum] = useState(null);
    const [activeTab, setActiveTab] = useState("feed");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [userRole, setUserRole] = useState(null);

    // Use propForumId if provided (from Dashboard), otherwise get from URL params
    const forumId = propForumId || urlForumId;

    useEffect(() => {
        const fetchForum = async () => {
            try {
                // Fetch forum details
                const res = await api.get(`forums/${forumId}/`);
                setForum(res.data);

                // Fetch user's role in this forum (if available)
                try {
                    const roleRes = await api.get(`forums/${forumId}/my-role/`);
                    console.log("User role fetched:", roleRes.data);
                    setUserRole(roleRes.data.role || null);
                } catch (e) {
                    console.log("Error fetching user role:", e.response?.status, e.message);
                    setUserRole(null);
                }
            } catch (err) {
                setError("Failed to load forum");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchForum();
    }, [forumId]);

    // Clear tab notifications when active tab changes
    // Note: Only clear if tab actually changed (not on mount)
    const previousTabRef = useRef(null);
    const isInitialMountRef = useRef(true);

    useEffect(() => {
        // Skip clearing on initial mount
        if (isInitialMountRef.current) {
            isInitialMountRef.current = false;
            previousTabRef.current = activeTab;
            return;
        }

        // Only clear if tab actually changed
        if (forumId && previousTabRef.current !== activeTab) {
            previousTabRef.current = activeTab;
            clearTabNotifications(forumId, activeTab);
        }
    }, [activeTab, forumId, clearTabNotifications]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <p className="text-gray-500">Loading forum...</p>
            </div>
        );
    }

    if (error || !forum) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <div className="text-center">
                    <p className="text-red-500 mb-4">{error || "Forum not found"}</p>
                    <button
                        onClick={() => onBack ? onBack() : navigate("/dashboard")}
                        className="bg-primary text-white px-4 py-2 rounded-lg"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const renderTabContent = () => {
        const props = { forum, userRole };

        switch (activeTab) {
            case "feed":
                return <ForumFeed {...props} />;
            case "meetings":
                return <ForumMeetings {...props} />;
            case "payments":
                return <ForumPayments {...props} />;
            case "disbursements":
                return <ForumDisbursement {...props} />;
            case "members":
                return <ForumMembers {...props} />;
            case "about":
                return <ForumAbout {...props} />;
            case "announcements":
                return <ForumAnnouncements {...props} />;
            case "polls":
                return <ForumPolls {...props} />;
            case "settings":
                return <ForumSettings forum={forum} userRole={userRole} />;
            default:
                return <ForumFeed {...props} />;
        }
    };

    const handleProfilePictureUpdate = async () => {
        // Refresh forum data after profile picture upload
        try {
            const res = await api.get(`forums/${forumId}/`);
            setForum(res.data);
        } catch (err) {
            console.error("Failed to refresh forum data:", err);
        }
    };

    return (
        <div className="h-full flex flex-col overflow-hidden bg-gray-50">
            {/* Forum Header */}
            <ForumHeader forum={forum} userRole={userRole} onProfilePictureUpdate={handleProfilePictureUpdate} />

            {/* Tab Navigation and Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Tab Navigation */}
                <ForumTabNav activeTab={activeTab} onTabChange={setActiveTab} forumId={forumId} />

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto bg-gray-50">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
}
