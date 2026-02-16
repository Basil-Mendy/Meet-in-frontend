import { useRef, useState, useEffect } from "react";
import { useNotifications } from "../../context/NotificationContext";

const tabs = [
    { id: "feed", label: "Feed", icon: "📰" },
    { id: "meetings", label: "Meetings", icon: "📅" },
    { id: "payments", label: "Payments", icon: "💳" },
    { id: "disbursements", label: "Disbursements", icon: "💰" },
    { id: "members", label: "Members", icon: "👥" },
    { id: "about", label: "About", icon: "ℹ️" },
    { id: "announcements", label: "Announcements", icon: "📢" },
    { id: "polls", label: "Polls", icon: "🗳️" },
    { id: "settings", label: "Settings", icon: "⚙️" },
];

export default function ForumTabNav({ activeTab, onTabChange, forumId }) {
    const navRef = useRef(null);
    const [showOverflowHint, setShowOverflowHint] = useState(false);
    const { getTabUnreadCount } = useNotifications();

    useEffect(() => {
        const el = navRef.current;
        if (!el) return;

        const check = () => setShowOverflowHint(el.scrollWidth > el.clientWidth + 2);
        check();
        const onResize = () => check();
        window.addEventListener("resize", onResize);
        el.addEventListener("scroll", check);
        return () => {
            window.removeEventListener("resize", onResize);
            el.removeEventListener("scroll", check);
        };
    }, []);

    return (
        <div className="relative bg-white border-b border-gray-200">
            <div ref={navRef} className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
                <div className="flex items-center px-2">
                    {tabs.map((tab) => {
                        const unreadCount = forumId ? getTabUnreadCount(forumId, tab.id) : 0;
                        console.debug(`[ForumTabNav] Tab ${tab.id}: unreadCount=${unreadCount}, forumId=${forumId}`);
                        return (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={`px-3 py-2 whitespace-nowrap text-sm md:text-base font-medium transition border-b-2 relative ${activeTab === tab.id
                                    ? "border-primary text-primary"
                                    : "border-transparent text-gray-600 hover:text-primary"
                                    }`}
                            >
                                <span className="md:hidden">{tab.icon}</span>
                                <span className="hidden md:inline">{tab.icon} {tab.label}</span>

                                {/* Notification badge for all tabs */}
                                {unreadCount > 0 && (
                                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Overflow hint shown on small screens when nav is scrollable */}
            {showOverflowHint && (
                <div className="md:hidden absolute right-1 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1 shadow-sm pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                </div>
            )}
        </div>
    );
}
