import { useState, useEffect } from "react";
import api from "../../../api/axios";
import { useNotifications } from "../../../context/NotificationContext";
import NotificationMessageBar from "../../notifications/NotificationMessageBar";

// ==================== CREATE POLL MODAL ====================
function CreatePollModal({ forumId, isAdmin, onSuccess, onClose }) {
    const [groupTitle, setGroupTitle] = useState("");
    const [groupDescription, setGroupDescription] = useState("");
    const [createNewGroup, setCreateNewGroup] = useState(true);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [availableGroups, setAvailableGroups] = useState([]);

    const [question, setQuestion] = useState("");
    const [description, setDescription] = useState("");
    const [options, setOptions] = useState(["", ""]);
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [ballotType, setBallotType] = useState("SECRET");
    const [voteType, setVoteType] = useState("SINGLE");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        // Load available poll groups
        fetchGroups();
    }, [forumId]);

    const fetchGroups = async () => {
        try {
            const res = await api.get(`forums/${forumId}/poll-groups/`);
            setAvailableGroups(Array.isArray(res.data) ? res.data : res.data.results || []);
        } catch (err) {
            console.error("Failed to load groups", err);
        }
    };

    const handleAddOption = () => {
        if (options.length < 20) setOptions([...options, ""]);
    };

    const handleRemoveOption = (index) => {
        if (options.length > 2) setOptions(options.filter((_, i) => i !== index));
    };

    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!question.trim()) { setError("Poll question is required"); return; }
        const validOptions = options.filter(opt => opt.trim());
        if (validOptions.length < 2) { setError("At least 2 options required"); return; }
        if (validOptions.length > 20) { setError("Max 20 options allowed"); return; }
        if (!startTime || !endTime) { setError("Start and end times required"); return; }

        const start = new Date(startTime), end = new Date(endTime);
        if (end <= start) { setError("End time must be after start"); return; }

        if (createNewGroup && !groupTitle.trim()) { setError("Group title is required"); return; }

        try {
            setLoading(true);

            let groupId = selectedGroup;

            // Create group if needed
            if (createNewGroup) {
                const groupRes = await api.post(`forums/${forumId}/poll-groups/`, {
                    title: groupTitle.trim(),
                    description: groupDescription.trim(),
                });
                groupId = groupRes.data.id;
            }

            // Create poll
            await api.post(`forums/${forumId}/polls/`, {
                group: groupId || null,
                title: question.trim(),
                description: description.trim(),
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                ballot_type: ballotType,
                vote_type: voteType,
                options: validOptions,
            });
            onSuccess();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || "Failed to create poll");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white  rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b p-6">
                    <h2 className="text-2xl font-bold">Create Poll</h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg">{error}</div>}

                    <div>
                        <label className="block text-sm font-semibold mb-2">Poll Group</label>
                        <div className="space-y-3">
                            <label className="flex items-center">
                                <input type="radio" checked={createNewGroup} onChange={() => setCreateNewGroup(true)} className="mr-3" />
                                <span className="text-sm">Create New Group</span>
                            </label>
                            {createNewGroup && (
                                <div className="ml-6 space-y-3">
                                    <div>
                                        <label className="block text-xs font-semibold mb-1">Group Title</label>
                                        <input type="text" value={groupTitle} onChange={(e) => setGroupTitle(e.target.value)} maxLength={255}
                                            placeholder="e.g., 2026 General Elections"
                                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1">Group Description (optional)</label>
                                        <textarea value={groupDescription} onChange={(e) => setGroupDescription(e.target.value)} rows={2}
                                            placeholder="About this group..."
                                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                </div>
                            )}

                            {availableGroups.length > 0 && (
                                <>
                                    <label className="flex items-center">
                                        <input type="radio" checked={!createNewGroup} onChange={() => setCreateNewGroup(false)} className="mr-3" />
                                        <span className="text-sm">Use Existing Group</span>
                                    </label>
                                    {!createNewGroup && (
                                        <div className="ml-6">
                                            <select value={selectedGroup || ""} onChange={(e) => setSelectedGroup(e.target.value)}
                                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                                <option value="">-- Select a group --</option>
                                                {availableGroups.map(g => (
                                                    <option key={g.id} value={g.id}>{g.title}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </>
                            )}

                            <label className="flex items-center">
                                <input type="radio" checked={!createNewGroup && !selectedGroup} onChange={() => { setCreateNewGroup(false); setSelectedGroup(null); }} className="mr-3" />
                                <span className="text-sm">No Group (Standalone Poll)</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-2">Poll Question *</label>
                        <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={255}
                            placeholder="e.g., Who should become the chairman?"
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <p className="text-xs text-gray-500 mt-1">{question.length}/255</p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-2">Description (optional)</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                            placeholder="Additional context..."
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-2">Start Time *</label>
                            <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">End Time *</label>
                            <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-2">Options * (2-20)</label>
                        <div className="space-y-2">
                            {options.map((option, index) => (
                                <div key={index} className="flex gap-2">
                                    <input type="text" value={option} onChange={(e) => handleOptionChange(index, e.target.value)}
                                        maxLength={255} placeholder={`Option ${index + 1}`}
                                        className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    {options.length > 2 && (
                                        <button type="button" onClick={() => handleRemoveOption(index)} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg">✕</button>
                                    )}
                                </div>
                            ))}
                        </div>
                        {options.length < 20 && (
                            <button type="button" onClick={handleAddOption} className="mt-2 text-sm text-blue-600 hover:underline">
                                + Add Option
                            </button>
                        )}
                    </div>

                    <div className="border-t pt-4 space-y-4">
                        <h3 className="font-semibold">Voting Rules</h3>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Ballot Type</label>
                            <div className="space-y-2">
                                <label className="flex items-center">
                                    <input type="radio" value="SECRET" checked={ballotType === "SECRET"} onChange={(e) => setBallotType(e.target.value)} className="mr-3" />
                                    <span className="text-sm"><span className="font-medium">Secret Ballot</span><span className="text-gray-500"> - Voter names hidden</span></span>
                                </label>
                                <label className="flex items-center">
                                    <input type="radio" value="OPEN" checked={ballotType === "OPEN"} onChange={(e) => setBallotType(e.target.value)} className="mr-3" />
                                    <span className="text-sm"><span className="font-medium">Open Ballot</span><span className="text-gray-500"> - Voters shown</span></span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-2">Voting Frequency</label>
                            <div className="space-y-2">
                                <label className="flex items-center">
                                    <input type="radio" value="SINGLE" checked={voteType === "SINGLE"} onChange={(e) => setVoteType(e.target.value)} className="mr-3" />
                                    <span className="text-sm"><span className="font-medium">Vote Once</span><span className="text-gray-500"> - Select one</span></span>
                                </label>
                                <label className="flex items-center">
                                    <input type="radio" value="MULTIPLE" checked={voteType === "MULTIPLE"} onChange={(e) => setVoteType(e.target.value)} className="mr-3" />
                                    <span className="text-sm"><span className="font-medium">Multiple Votes</span><span className="text-gray-500"> - Select many</span></span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-6 border-t">
                        <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                            {loading ? "Creating..." : "Create Poll"}
                        </button>
                        <button type="button" onClick={onClose} disabled={loading} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ==================== POLL CARD ====================
function PollCard({ poll, forumId, isAdmin, onVote, onArchive }) {
    const [selectedOptions, setSelectedOptions] = useState([]);
    const [voting, setVoting] = useState(false);
    const [error, setError] = useState("");
    const [showVoters, setShowVoters] = useState({});

    const handleVote = async () => {
        if (selectedOptions.length === 0) { setError("Please select an option"); return; }
        try {
            setVoting(true);
            setError("");
            await api.post(`forums/${forumId}/polls/${poll.id}/vote/`, { option_ids: selectedOptions });
            setSelectedOptions([]);
            onVote(poll.id);
        } catch (err) {
            setError(err.response?.data?.error || "Failed to vote");
        } finally {
            setVoting(false);
        }
    };

    const canVote = poll.status === "ACTIVE" && !poll.user_voted;
    const statusColor = { UPCOMING: "bg-yellow-100 text-yellow-800", ACTIVE: "bg-green-100 text-green-800", CLOSED: "bg-gray-100 text-gray-800" };

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md p-5 space-y-4">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    {poll.group_title && <div className="text-xs font-semibold text-blue-600 mb-1">📋 {poll.group_title}</div>}
                    <h3 className="text-lg font-bold">{poll.title}</h3>
                    {poll.description && <p className="text-sm text-gray-600 mt-1">{poll.description}</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`text-xs px-2 py-1 rounded font-medium ${statusColor[poll.status]}`}>{poll.status}</span>
                        <span className="text-xs text-gray-500">Created by {poll.created_by_name}</span>
                    </div>
                </div>
                {/* Archive button removed per new UX - status is shown alongside titles */}
            </div>

            <div className="text-xs text-gray-500 space-y-1">
                <div>Start: {new Date(poll.start_time).toLocaleString()}</div>
                <div>End: {new Date(poll.end_time).toLocaleString()}</div>
            </div>

            <div className="flex gap-2 flex-wrap">
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">{poll.ballot_type === "SECRET" ? "🔒 Secret" : "👁️ Open"}</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">{poll.vote_type === "SINGLE" ? "☝️ Single" : "✋ Multiple"}</span>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-2 rounded">{error}</div>}

            <div className="space-y-3">
                {poll.options.map((option) => {
                    const percentage = poll.total_votes > 0 ? option.percentage : 0;
                    const isSelected = selectedOptions.includes(option.id);

                    return (
                        <div key={option.id}>
                            {canVote ? (
                                <button onClick={() => poll.vote_type === "SINGLE" ? setSelectedOptions([option.id]) : setSelectedOptions(prev => prev.includes(option.id) ? prev.filter(id => id !== option.id) : [...prev, option.id])}
                                    className={`w-full text-left p-3 border-2 rounded-lg ${isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                                    <div className="flex justify-between">
                                        <span className="font-medium">{option.option_text}</span>
                                        <span className="text-sm text-gray-600">{option.votes_count}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 h-2 mt-2 rounded-full"><div className="bg-blue-500 h-2 rounded-full" style={{ width: `${percentage}%` }} /></div>
                                    <span className="text-xs text-gray-500 mt-1 block">{percentage.toFixed(1)}%</span>
                                </button>
                            ) : (
                                <div className="p-3 bg-gray-50 border rounded-lg">
                                    <div className="flex justify-between mb-1"><span className="font-medium">{option.option_text}</span><span className="text-sm text-gray-600">{option.votes_count}</span></div>
                                    <div className="w-full bg-gray-200 h-2 rounded-full"><div className="bg-gray-600 h-2 rounded-full" style={{ width: `${percentage}%` }} /></div>
                                    <span className="text-xs text-gray-500 mt-1 block">{percentage.toFixed(1)}%</span>
                                </div>
                            )}
                            {poll.ballot_type === "OPEN" && option.voters.length > 0 && (
                                <div className="ml-3">
                                    <button onClick={() => setShowVoters(prev => ({ ...prev, [option.id]: !prev[option.id] }))} className="text-xs text-blue-600 hover:underline">
                                        {showVoters[option.id] ? "Hide" : "Show"} ({option.voters.length})
                                    </button>
                                    {showVoters[option.id] && (
                                        <div className="mt-1 bg-gray-50 p-2 rounded text-xs space-y-1">
                                            {option.voters.map((v, i) => <div key={i}>✓ {v.voter_name}</div>)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {poll.status === "CLOSED" && <div className="bg-blue-50 border border-blue-200 rounded p-3"><p className="text-sm font-semibold text-blue-900">{poll.result}</p></div>}
            {canVote && <button onClick={handleVote} disabled={voting || selectedOptions.length === 0} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">{voting ? "Voting..." : "✓ Submit"}</button>}
            {poll.user_voted && poll.status !== "CLOSED" && <div className="text-center text-sm text-green-600 font-medium">✓ You voted</div>}
            <div className="text-center text-xs text-gray-500 border-t pt-2">{poll.total_votes} vote{poll.total_votes !== 1 ? "s" : ""}</div>
        </div>
    );
}

// ==================== MAIN COMPONENT ====================
export default function ForumPolls({ forum, userRole }) {
    const [polls, setPolls] = useState([]);
    const [openPolls, setOpenPolls] = useState({});
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showArchived, setShowArchived] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState({});

    const isAdmin = userRole && ["SA", "CP"].includes(userRole);
    const { clearTabNotifications } = useNotifications();

    useEffect(() => {
        fetchPolls();
        if (forum?.id) {
            clearTabNotifications(forum.id, "polls");
        }
    }, [forum?.id, showArchived, clearTabNotifications]);

    const fetchPolls = async () => {
        try {
            setLoading(true);
            if (!forum?.id) return;
            const res = await api.get(`forums/${forum.id}/polls/`, { params: { archived: showArchived } });
            setPolls(Array.isArray(res.data) ? res.data : res.data.results || []);
        } catch (err) {
            console.error("Failed to load polls", err);
            setPolls([]);
        } finally {
            setLoading(false);
        }
    };

    const toggleGroup = (groupTitle) => {
        setExpandedGroups(prev => ({ ...prev, [groupTitle]: !prev[groupTitle] }));
    };

    const toggleOpenPoll = (pollId) => {
        setOpenPolls(prev => ({ ...prev, [pollId]: !prev[pollId] }));
    };

    // Build unified lists: current polls (upcoming|active) first, then past (closed)
    const sortByCreatedDesc = (a, b) => new Date(b.created_at) - new Date(a.created_at);
    const currentPolls = polls.filter(p => p.status === "UPCOMING" || p.status === "ACTIVE").sort(sortByCreatedDesc);
    const pastPolls = polls.filter(p => !(p.status === "UPCOMING" || p.status === "ACTIVE")).sort(sortByCreatedDesc);

    // Build render sequence that mixes groups and standalone polls while preserving created_at ordering.
    const buildRenderSequence = (pollList) => {
        const groups = {};
        const standalone = [];

        pollList.forEach(p => {
            if (p.group_title) {
                if (!groups[p.group_title]) groups[p.group_title] = [];
                groups[p.group_title].push(p);
            } else {
                standalone.push(p);
            }
        });

        const entries = [];
        // Group entries with a representative created_at (newest in group)
        Object.entries(groups).forEach(([title, grp]) => {
            const newest = grp.slice().sort(sortByCreatedDesc)[0];
            entries.push({ type: 'group', title, polls: grp.slice().sort(sortByCreatedDesc), created_at: newest.created_at });
        });

        // Standalone entries
        standalone.forEach(p => entries.push({ type: 'poll', poll: p, created_at: p.created_at }));

        // Sort entries by created_at desc
        return entries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    };

    const currentSequence = buildRenderSequence(currentPolls);
    const pastSequence = buildRenderSequence(pastPolls);

    if (loading) return <div className="text-center py-8 text-gray-500">Loading polls...</div>;

    return (
        <div className="space-y-4 md:space-y-6 px-4 md:px-8 pt-4 md:pt-6">
            <NotificationMessageBar forumId={forum?.id} tab="polls" />

            <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg md:text-2xl font-bold">Polls</h2>
                {isAdmin && <button onClick={() => setShowCreateModal(true)} className="px-2 py-1 text-xs sm:px-4 sm:py-2 sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap flex-shrink-0">+ Create</button>}
            </div>

            {/* Removed Active/Archived toggle buttons - use headers to differentiate grouped vs standalone polls */}

            {!showArchived && (
                <>
                    {/* Current polls: upcoming and active first, mixed across groups and standalone, sorted by created_at */}
                    {currentSequence.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-3">Current Polls</h3>
                            <div className="space-y-3">
                                {currentSequence.map(entry => (
                                    entry.type === 'group' ? (
                                        <div key={entry.title}>
                                            <div>
                                                <button onClick={() => toggleGroup(entry.title)} className="w-full text-left px-4 py-3 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg hover:from-blue-100 hover:to-blue-150 font-semibold text-blue-900 flex items-center justify-between">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span>{entry.title}</span>
                                                        <span className="text-xs px-2 py-1 rounded bg-blue-200 text-blue-900 font-bold">[Group]</span>
                                                        {/* counts */}
                                                        <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">Upcoming: {entry.polls.filter(p => p.status === 'UPCOMING').length}</span>
                                                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">Active: {entry.polls.filter(p => p.status === 'ACTIVE').length}</span>
                                                        <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800">Closed: {entry.polls.filter(p => p.status === 'CLOSED').length}</span>
                                                    </div>
                                                    <span className="text-xl">{expandedGroups[entry.title] ? "▼" : "▶"}</span>
                                                </button>


                                            </div>
                                            {expandedGroups[entry.title] && (
                                                <div className="mt-3 ml-4 space-y-3">
                                                    {entry.polls.map(p => (
                                                        <PollCard key={p.id} poll={p} forumId={forum.id} isAdmin={isAdmin} onVote={() => fetchPolls()} onArchive={() => fetchPolls()} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div key={entry.poll.id} className="bg-white border rounded-lg">
                                            <button onClick={() => toggleOpenPoll(entry.poll.id)} className="w-full text-left px-4 py-3 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{entry.poll.title}</span>
                                                    <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-900 font-bold">[Standalone]</span>
                                                </div>
                                                <span className={`text-xs px-2 py-1 rounded font-medium ${entry.poll.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : entry.poll.status === 'UPCOMING' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{entry.poll.status}</span>
                                            </button>
                                            {openPolls[entry.poll.id] && (
                                                <div className="p-4">
                                                    <PollCard poll={entry.poll} forumId={forum.id} isAdmin={isAdmin} onVote={() => fetchPolls()} onArchive={() => fetchPolls()} />
                                                </div>
                                            )}
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Past polls (closed) listed by created_at regardless of grouping */}
                    {pastSequence.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mt-6 mb-3">Past Polls</h3>
                            <div className="space-y-3">
                                {pastSequence.map(entry => (
                                    entry.type === 'group' ? (
                                        <div key={entry.title}>
                                            <div>
                                                <button onClick={() => toggleGroup(entry.title)} className="w-full text-left px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg hover:from-gray-100 hover:to-gray-150 font-semibold text-gray-900 flex items-center justify-between">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span>{entry.title}</span>
                                                        <span className="text-xs px-2 py-1 rounded bg-gray-300 text-gray-900 font-bold">[Group]</span>
                                                        <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">Upcoming: {entry.polls.filter(p => p.status === 'UPCOMING').length}</span>
                                                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">Active: {entry.polls.filter(p => p.status === 'ACTIVE').length}</span>
                                                        <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800">Closed: {entry.polls.filter(p => p.status === 'CLOSED').length}</span>
                                                    </div>
                                                    <span className="text-xl">{expandedGroups[entry.title] ? "▼" : "▶"}</span>
                                                </button>
                                                {expandedGroups[entry.title] && (
                                                    <div className="mt-3 ml-4 space-y-3">
                                                        {entry.polls.map(p => (
                                                            <PollCard key={p.id} poll={p} forumId={forum.id} isAdmin={isAdmin} onVote={() => fetchPolls()} onArchive={() => fetchPolls()} />
                                                        ))}
                                                    </div>
                                                )}


                                            </div>
                                        </div>
                                    ) : (
                                        <div key={entry.poll.id} className="bg-white border rounded-lg">
                                            <button onClick={() => toggleOpenPoll(entry.poll.id)} className="w-full text-left px-4 py-3 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{entry.poll.title}</span>
                                                    <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-900 font-bold">[Standalone]</span>
                                                </div>
                                                <span className="text-xs px-2 py-1 rounded font-medium bg-gray-100 text-gray-800">{entry.poll.status}</span>
                                            </button>
                                            {openPolls[entry.poll.id] && (
                                                <div className="p-4">
                                                    <PollCard poll={entry.poll} forumId={forum.id} isAdmin={isAdmin} onVote={() => fetchPolls()} onArchive={() => fetchPolls()} />
                                                </div>
                                            )}
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {showArchived && (
                <div>
                    <h3 className="text-lg font-semibold mb-3">Archived Polls</h3>
                    <div className="space-y-3">
                        {polls.length > 0 ? polls.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(p => (
                            <PollCard key={p.id} poll={p} forumId={forum.id} isAdmin={isAdmin} onVote={() => fetchPolls()} onArchive={() => fetchPolls()} />
                        )) : <div className="text-center py-8 text-gray-500">No archived polls</div>}
                    </div>
                </div>
            )}

            {polls.length === 0 && !showArchived && (
                <div className="text-center py-12 bg-gray-50 rounded-lg border">
                    <p className="text-gray-500 mb-3">No polls</p>
                    {isAdmin && <button onClick={() => setShowCreateModal(true)} className="text-blue-600 hover:underline">Create first</button>}
                </div>
            )}

            {showCreateModal && <CreatePollModal forumId={forum.id} isAdmin={isAdmin} onSuccess={() => { fetchPolls(); setShowCreateModal(false); }} onClose={() => setShowCreateModal(false)} />}
        </div>
    );
}
