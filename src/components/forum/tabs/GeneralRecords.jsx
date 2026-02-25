import { useEffect, useState } from "react";
import api from "../../../api/axios";

/**
 * General Records Page
 * Allows forum admins to fetch and view all forum activities/history
 * from specific date ranges and tabs, arranged in sequential order
 * ready for presentation or printing.
 */
export default function GeneralRecords({ forum, userRole }) {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Filter states
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [selectedTabs, setSelectedTabs] = useState([]);
    const [activityType, setActivityType] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    const [totalRecords, setTotalRecords] = useState(0);
    const [showFilters, setShowFilters] = useState(true);
    const [showPreview, setShowPreview] = useState(false);

    // Available tabs and their icons
    const TABS = [
        { value: "feed", label: "Feed", icon: "📰" },
        { value: "meetings", label: "Meetings", icon: "📅" },
        { value: "payments", label: "Payments", icon: "💳" },
        { value: "disbursements", label: "Disbursements", icon: "💰" },
        { value: "members", label: "Members", icon: "👥" },
        { value: "about", label: "About", icon: "ℹ️" },
        { value: "announcements", label: "Announcements", icon: "📢" },
        { value: "polls", label: "Polls", icon: "🗳️" },
        { value: "settings", label: "Settings", icon: "⚙️" },
    ];

    // Check if user is admin
    const isAdmin = userRole && !["MEMBER"].includes(userRole);

    // Fetch records whenever filters change
    useEffect(() => {
        if (isAdmin) {
            fetchRecords();
        }
    }, [dateFrom, dateTo, selectedTabs, activityType, searchTerm]);

    const fetchRecords = async () => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams();
            if (dateFrom) params.append("date_from", dateFrom);
            if (dateTo) params.append("date_to", dateTo);
            if (activityType) params.append("activity_type", activityType);
            if (searchTerm) params.append("search", searchTerm);

            // Add selected tabs
            selectedTabs.forEach(tab => params.append("tabs", tab));

            // If no tabs selected, fetch all
            if (selectedTabs.length === 0) {
                TABS.forEach(tab => params.append("tabs", tab.value));
            }

            const response = await api.get(
                `/forums/${forum.id}/about/general-records/`,
                { params }
            );

            setRecords(response.data.results || []);
            setTotalRecords(response.data.count || 0);
        } catch (err) {
            console.error("Failed to fetch records:", err);
            setError("Failed to fetch general records. Please ensure you are a forum admin.");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleTab = (tabValue) => {
        setSelectedTabs(prev =>
            prev.includes(tabValue)
                ? prev.filter(t => t !== tabValue)
                : [...prev, tabValue]
        );
    };

    const handleClearFilters = () => {
        setDateFrom("");
        setDateTo("");
        setSelectedTabs([]);
        setActivityType("");
        setSearchTerm("");
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportCSV = () => {
        try {
            // Create CSV content
            const headers = [
                "Date",
                "Time",
                "Activity Type",
                "Tab",
                "Title",
                "Description",
                "Performed By",
                "Email"
            ];

            const rows = records.map(record => {
                const date = new Date(record.created_at);
                return [
                    date.toLocaleDateString(),
                    date.toLocaleTimeString(),
                    record.activity_type_display,
                    record.tab_display,
                    record.title,
                    record.description || "",
                    record.performed_by_name || "Unknown",
                    record.performed_by_email || ""
                ];
            });

            const csvContent = [
                headers.join(","),
                ...rows.map(row =>
                    row.map(cell => `"${cell}"`).join(",")
                )
            ].join("\n");

            // Create blob and download
            const blob = new Blob([csvContent], { type: "text/csv" });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `forum-general-records-${new Date().toISOString().split("T")[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to export CSV:", err);
            alert("Failed to export records to CSV");
        }
    };

    if (!isAdmin) {
        return (
            <div className="max-w-7xl mx-auto p-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <p className="text-yellow-800">
                        Only forum admins can access the General Records page.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border-l-4 border-blue-500">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">📋 General Records</h1>
                        <p className="text-sm md:text-base text-gray-600 mt-1">
                            View and manage forum activity history
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => setShowPreview(true)}
                            className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm sm:text-base font-medium"
                            title="Preview records"
                            disabled={records.length === 0}
                        >
                            👁️ Preview
                        </button>
                        <button
                            onClick={handlePrint}
                            className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm sm:text-base font-medium disabled:opacity-50"
                            title="Print or save as PDF"
                            disabled={records.length === 0}
                        >
                            🖨️ Print
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm sm:text-base font-medium disabled:opacity-50"
                            title="Export as CSV"
                            disabled={records.length === 0}
                        >
                            📊 Export
                        </button>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                    {error}
                </div>
            )}

            {/* Filters Section */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div
                    className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 cursor-pointer flex items-center justify-between"
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <h2 className="text-xl font-semibold text-gray-900">
                        🔍 Filters
                    </h2>
                    <span className="text-2xl transition-transform" style={{
                        transform: showFilters ? "rotate(180deg)" : "rotate(0deg)"
                    }}>
                        ⌄
                    </span>
                </div>

                {showFilters && (
                    <div className="p-6 border-t space-y-6">
                        {/* Date Range */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    From Date
                                </label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    To Date
                                </label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Tabs Selection */}
                        <div>
                            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-3">
                                Select Tabs (Leave empty for all)
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                {TABS.map(tab => (
                                    <label
                                        key={tab.value}
                                        className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition ${selectedTabs.includes(tab.value)
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 bg-white hover:border-gray-300"
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedTabs.includes(tab.value)}
                                            onChange={() => handleToggleTab(tab.value)}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-lg">{tab.icon}</span>
                                        <span className="text-sm font-medium">{tab.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Search */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Search in Title/Description
                            </label>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="e.g., 'Payment received' or 'Meeting scheduled'"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Clear Filters Button */}
                        <button
                            onClick={handleClearFilters}
                            className="w-full px-3 sm:px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium text-sm sm:text-base"
                        >
                            Clear All Filters
                        </button>
                    </div>
                )}
            </div>

            {/* Records Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-900 font-semibold">
                    📊 {totalRecords} record{totalRecords !== 1 ? "s" : ""} found
                </p>
            </div>

            {/* Records List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Loading records...</p>
                    </div>
                ) : records.length === 0 ? (
                    <div className="bg-gray-50 rounded-lg p-12 text-center">
                        <p className="text-gray-600 text-lg">
                            {totalRecords === 0 ? "No records found matching your filters." : "Loading..."}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3 print:space-y-2">
                        {records.map((record, index) => {
                            const date = new Date(record.created_at);
                            const formattedDate = date.toLocaleDateString();
                            const formattedTime = date.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit"
                            });

                            return (
                                <div
                                    key={record.id}
                                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition print:break-inside-avoid"
                                >
                                    {/* Record Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                                                    {record.tab_display}
                                                </span>
                                                <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full">
                                                    {record.activity_type_display}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-bold text-gray-900">
                                                {record.title}
                                            </h3>
                                        </div>
                                        <div className="text-right text-sm text-gray-500 ml-4">
                                            <div className="font-semibold">{formattedDate}</div>
                                            <div className="text-xs">{formattedTime}</div>
                                        </div>
                                    </div>

                                    {/* Record Body */}
                                    {record.description && (
                                        <p className="text-gray-700 mb-3 text-sm leading-relaxed">
                                            {record.description}
                                        </p>
                                    )}

                                    {/* Metadata */}
                                    <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-3">
                                        <div className="flex items-center gap-4">
                                            <span>
                                                👤 <span className="font-semibold">{record.performed_by_name || "System"}</span>
                                            </span>
                                            {record.performed_by_email && (
                                                <span>
                                                    ✉️ {record.performed_by_email}
                                                </span>
                                            )}
                                        </div>
                                        {record.object_id && (
                                            <span className="bg-gray-100 px-2 py-1 rounded">
                                                ID: {record.object_id}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Print Styles */}
            <style>{`
                @media print {
                    body {
                        background: white;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                    .print\\:break-inside-avoid {
                        break-inside: avoid;
                    }
                    .print\\:space-y-2 > * + * {
                        margin-top: 0.5rem;
                    }
                    .max-w-7xl {
                        max-width: none;
                    }
                }
            `}</style>

            {/* Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                        {/* Preview Header */}
                        <div className="flex items-center justify-between bg-gradient-to-r from-purple-600 to-purple-700 p-4 sm:p-6 text-white rounded-t-lg">
                            <div>
                                <h2 className="text-lg sm:text-2xl font-bold">📋 General Records Preview</h2>
                                <p className="text-sm text-purple-100 mt-1">{totalRecords} record{totalRecords !== 1 ? 's' : ''}</p>
                            </div>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="text-2xl hover:text-purple-200 transition"
                                title="Close preview"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Preview Content */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                            {records.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    No records to preview
                                </div>
                            ) : (
                                records.map((record, index) => {
                                    const date = new Date(record.created_at);
                                    const formattedDate = date.toLocaleDateString();
                                    return (
                                        <div
                                            key={record.id}
                                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded">
                                                            #{index + 1}
                                                        </span>
                                                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                                                            {record.tab_display}
                                                        </span>
                                                        <span className="inline-block px-2 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded">
                                                            {record.activity_type_display}
                                                        </span>
                                                    </div>
                                                    <h3 className="font-bold text-gray-900 text-sm">
                                                        {record.title}
                                                    </h3>
                                                </div>
                                                <div className="text-xs text-gray-500 text-right ml-2">
                                                    {formattedDate}
                                                </div>
                                            </div>
                                            {record.description && (
                                                <p className="text-gray-700 text-xs mb-2">
                                                    {record.description}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2 text-xs text-gray-500 border-t pt-2">
                                                <span>👤 {record.performed_by_name || "System"}</span>
                                                {record.performed_by_email && (
                                                    <span className="text-gray-400">•</span>
                                                )}
                                                {record.performed_by_email && (
                                                    <span>{record.performed_by_email}</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Preview Footer */}
                        <div className="flex gap-2 p-4 sm:p-6 border-t bg-gray-50 rounded-b-lg">
                            <button
                                onClick={() => {
                                    setShowPreview(false);
                                    handlePrint();
                                }}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
                            >
                                🖨️ Print from Preview
                            </button>
                            <button
                                onClick={() => {
                                    setShowPreview(false);
                                    handleExportCSV();
                                }}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm"
                            >
                                📊 Export from Preview
                            </button>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-medium text-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
