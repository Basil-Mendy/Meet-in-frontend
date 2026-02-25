import { useRef, useState, useEffect } from "react";
import { useNotifications } from "../../context/NotificationContext";
import { Newspaper, Calendar, CreditCard, Wallet, Users, Info, Megaphone, BarChart3, Settings } from "lucide-react";


const tabs = [
    { id: "feed", label: "Feed", icon: Newspaper },
    { id: "meetings", label: "Meetings", icon: Calendar },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "disbursements", label: "Disbursements", icon: Wallet },
    { id: "members", label: "Members", icon: Users },
    { id: "about", label: "About", icon: Info },
    { id: "announcements", label: "Announcements", icon: Megaphone },
    { id: "polls", label: "Polls", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
];

export default function ForumTabNav({ activeTab, onTabChange, forumId }) {
    const navRef = useRef(null);
    const [showOverflowHint, setShowOverflowHint] = useState(false);
    const { getTabUnreadCount, lastFetchedAt } = useNotifications();
    const isDev = import.meta.env.DEV;

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
                        // Determine if counts appear stale (debug only)
                        const lastFetchedMs = lastFetchedAt ? new Date(lastFetchedAt).getTime() : 0;
                        const ageMs = Date.now() - lastFetchedMs;
                        const countsStale = isDev ? (lastFetchedAt === null || ageMs > 15000) : false; // 15s threshold
                        const Icon = tab.icon;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={`min-w-[56px] md:min-w-[96px] h-8 md:h-10 px-2 md:px-3 py-1.5 md:py-2 whitespace-nowrap text-sm md:text-base font-medium flex items-center justify-center transition border-b-2 relative ${activeTab === tab.id
                                    ? "border-primary text-primary"
                                    : "border-transparent text-gray-600 hover:text-primary"
                                    }`}
                            >
                                <span className="flex items-center gap-1">
                                    <Icon className="h-5 w-5" aria-hidden="true" />
                                    <span className="hidden md:inline align-middle">{tab.label}</span>
                                </span>

                                {/* Notification badge for all tabs (smaller, positioned closer to label/icon) */}
                                {unreadCount > 0 && (
                                    <span
                                        role="status"
                                        aria-live="polite"
                                        aria-atomic="true"
                                        className="absolute inline-flex items-center justify-center bg-red-600 text-white rounded-full shadow-sm h-4 w-4 text-[10px] font-semibold md:h-5 md:w-5 md:text-[11px]"
                                        style={{ top: 4, right: 6, transform: 'translate(30%, -30%)' }}
                                    >
                                        <span aria-hidden>{unreadCount > 99 ? '99+' : unreadCount}</span>
                                        <span className="sr-only">{unreadCount} unread notifications</span>
                                    </span>
                                )}

                                {/* countsStale debug indicator removed for production UI */}
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
