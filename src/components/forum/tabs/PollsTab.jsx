import { useState, useEffect } from "react";
import api from "../../../api/axios";

function CreatePollModal({ forumId, isAdmin, onSuccess, onClose }) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [options, setOptions] = useState(["", ""]);
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [ballotType, setBallotType] = useState("SECRET");
    const [voteType, setVoteType] = useState("SINGLE");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleAddOption = () => {
        if (options.length < 20) {
            setOptions([...options, ""]);
        }
    };

    const handleRemoveOption = (index) => {
        if (options.length > 2) {
            setOptions(options.filter((_, i) => i !== index));
        }
    };

    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        // Validation
        if (!title.trim()) {
            setError("Poll title is required");
            return;
        }

        const validOptions = options.filter(opt => opt.trim());
        if (validOptions.length < 2) {
            setError("At least 2 options are required");
            return;
        }

        if (validOptions.length > 20) {
            setError("Maximum 20 options allowed");
            return;
        }

        if (!startTime || !endTime) {
            setError("Start and end times are required");
            return;
        }

        const start = new Date(startTime);
        const end = new Date(endTime);
        if (end <= start) {
            setError("End time must be after start time");
            return;
        }

        try {
            setLoading(true);
            await api.post(`forums/${forumId}/polls/`, {
                title: title.trim(),
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
            setError(
                err.response?.data?.error ||
                (Array.isArray(err.response?.data?.errors)
                    ? err.response.data.errors[0]
                    : "Failed to create poll")
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
                    <h2 className="text-2xl font-bold text-gray-900">Create Poll</h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Poll Title *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Which office location should we choose?"
                            maxLength={255}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">{title.length}/255</p>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Description (optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Additional context or details about this poll..."
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Timing */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Start Time *
                            </label>
                            <input
                                type="datetime-local"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                End Time *
                            </label>
                            <input
                                type="datetime-local"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Options */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Poll Options * (minimum 2, maximum 20)
                        </label>
                        <div className="space-y-2">
                            {options.map((option, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={option}
                                        onChange={(e) => handleOptionChange(index, e.target.value)}
                                        placeholder={`Option ${index + 1}`}
                                        maxLength={255}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    {options.length > 2 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveOption(index)}
                                            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        {options.length < 20 && (
                            <button
                                type="button"
                                onClick={handleAddOption}
                                className="mt-2 text-sm text-blue-600 hover:underline"
                            >
                                + Add Option
                            </button>
                        )}
                    </div>

                    {/* Voting Rules */}
                    <div className="border-t pt-4 space-y-4">
                        <h3 className="font-semibold text-gray-900">Voting Rules</h3>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Ballot Type
                            </label>
                            <div className="space-y-2">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        value="SECRET"
                                        checked={ballotType === "SECRET"}
                                        onChange={(e) => setBallotType(e.target.value)}
                                        className="mr-3"
                                    />
                                    <span className="text-sm">
                                        <span className="font-medium">Secret Ballot</span>
                                        <span className="text-gray-500"> - Voter names not visible</span>
                                    </span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        value="OPEN"
                                        checked={ballotType === "OPEN"}
                                        onChange={(e) => setBallotType(e.target.value)}
                                        className="mr-3"
                                    />
                                    <span className="text-sm">
                                        <span className="font-medium">Open Ballot</span>
                                        <span className="text-gray-500"> - Voters listed under each option</span>
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Voting Frequency
                            </label>
                            <div className="space-y-2">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        value="SINGLE"
                                        checked={voteType === "SINGLE"}
                                        onChange={(e) => setVoteType(e.target.value)}
                                        className="mr-3"
                                    />
                                    <span className="text-sm">
                                        <span className="font-medium">Vote Once Only</span>
                                        <span className="text-gray-500"> - Select one option</span>
                                    </span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        value="MULTIPLE"
                                        checked={voteType === "MULTIPLE"}
                                        onChange={(e) => setVoteType(e.target.value)}
                                        className="mr-3"
                                    />
                                    <span className="text-sm">
                                        <span className="font-medium">Vote Multiple Times</span>
                                        <span className="text-gray-500"> - Select multiple options</span>
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-6 border-t">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                        >
                            {loading ? "Creating..." : "Create Poll"}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function PollCard({ poll, forumId, isAdmin, onVote, onArchive, onRefresh }) {
    const [selectedOptions, setSelectedOptions] = useState([]);
    const [voting, setVoting] = useState(false);
    const [error, setError] = useState("");
    const [showVoters, setShowVoters] = useState({});

    const handleVote = async () => {
        if (selectedOptions.length === 0) {
            setError("Please select an option");
            return;
        }

        try {
            setVoting(true);
            setError("");
            await api.post(`forums/${forumId}/polls/${poll.id}/vote/`, {
                option_ids: selectedOptions,
            });
            setSelectedOptions([]);
            onVote(poll.id);
        } catch (err) {
            setError(err.response?.data?.error || "Failed to vote");
        } finally {
            setVoting(false);
        }
    };

    const handleArchive = async () => {
        try {
            await api.patch(`forums/${forumId}/polls/${poll.id}/archive/`);
            onArchive(poll.id);
        } catch (err) {
            console.error("Failed to archive poll");
        }
    };

    const toggleVotersList = (optionId) => {
        setShowVoters(prev => ({
            ...prev,
            [optionId]: !prev[optionId]
        }));
    };

    const canVote = poll.status === "ACTIVE" && !poll.user_voted;
    const statusColor = {
        UPCOMING: "bg-yellow-100 text-yellow-800",
        ACTIVE: "bg-green-100 text-green-800",
        CLOSED: "bg-gray-100 text-gray-800",
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition p-5 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{poll.title}</h3>
                    {poll.description && (
                        <p className="text-sm text-gray-600 mt-1">{poll.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`text-xs px-2 py-1 rounded font-medium ${statusColor[poll.status]}`}>
                            {poll.status}
                        </span>
                        <span className="text-xs text-gray-500">
                            Created by {poll.created_by_name} on {new Date(poll.created_at).toLocaleDateString()}
                        </span>
                    </div>
                </div>
                {isAdmin && (
                    <button
                        onClick={handleArchive}
                        className="text-gray-400 hover:text-gray-600 text-lg"
                        title={poll.is_archived ? "Unarchive" : "Archive"}
                    >
                        {poll.is_archived ? "📂" : "📪"}
                    </button>
                )}
            </div>

            {/* Timing */}
            <div className="text-xs text-gray-500 space-y-1">
                <div>Start: {new Date(poll.start_time).toLocaleString()}</div>
                <div>End: {new Date(poll.end_time).toLocaleString()}</div>
            </div>

            {/* Config Badges */}
            <div className="flex gap-2 flex-wrap">
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {poll.ballot_type === "SECRET" ? "🔒 Secret" : "👁️ Open"}
                </span>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {poll.vote_type === "SINGLE" ? "☝️ Single Vote" : "✋ Multiple Votes"}
                </span>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-2 rounded">
                    {error}
                </div>
            )}

            {/* Options with Results */}
            <div className="space-y-3">
                {poll.options.map((option) => {
                    const percentage = poll.total_votes > 0 ? option.percentage : 0;
                    const isSelected = selectedOptions.includes(option.id);

                    return (
                        <div key={option.id} className="space-y-2">
                            {/* Vote Button or Result */}
                            {canVote ? (
                                <button
                                    onClick={() => {
                                        if (poll.vote_type === "SINGLE") {
                                            setSelectedOptions([option.id]);
                                        } else {
                                            setSelectedOptions(prev =>
                                                prev.includes(option.id)
                                                    ? prev.filter(id => id !== option.id)
                                                    : [...prev, option.id]
                                            );
                                        }
                                    }}
                                    className={`w-full text-left p-3 border-2 rounded-lg transition ${isSelected
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 hover:border-gray-300"
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium">{option.option_text}</span>
                                        <span className="text-sm text-gray-600">
                                            {option.votes_count} vote{option.votes_count !== 1 ? "s" : ""}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                        <div
                                            className="bg-blue-500 h-2 rounded-full transition"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-gray-500 mt-1 block">
                                        {percentage.toFixed(1)}%
                                    </span>
                                </button>
                            ) : (
                                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium">{option.option_text}</span>
                                        <span className="text-sm text-gray-600">
                                            {option.votes_count} vote{option.votes_count !== 1 ? "s" : ""}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-gray-600 h-2 rounded-full transition"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-gray-500 mt-1 block">
                                        {percentage.toFixed(1)}%
                                    </span>
                                </div>
                            )}

                            {/* Voters List for Open Ballot */}
                            {poll.ballot_type === "OPEN" && option.voters.length > 0 && (
                                <div className="ml-3">
                                    <button
                                        onClick={() => toggleVotersList(option.id)}
                                        className="text-xs text-blue-600 hover:underline"
                                    >
                                        {showVoters[option.id] ? "Hide" : "Show"} voters ({option.voters.length})
                                    </button>
                                    {showVoters[option.id] && (
                                        <div className="mt-1 space-y-1 bg-gray-50 p-2 rounded text-xs">
                                            {option.voters.map((voter, idx) => (
                                                <div key={idx} className="text-gray-700">
                                                    ✓ {voter.voter_name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Results Summary */}
            {poll.status === "CLOSED" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm font-semibold text-blue-900">{poll.result}</p>
                </div>
            )}

            {/* Vote Button */}
            {canVote && (
                <button
                    onClick={handleVote}
                    disabled={voting || selectedOptions.length === 0}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                    {voting ? "Voting..." : "✓ Submit Vote"}
                </button>
            )}

            {/* Voted Status */}
            {poll.user_voted && poll.status !== "CLOSED" && (
                <div className="text-center text-sm text-green-600 font-medium">
                    ✓ You have voted
                </div>
            )}

            {/* Vote Count */}
            <div className="text-center text-xs text-gray-500 pt-2 border-t">
                {poll.total_votes} vote{poll.total_votes !== 1 ? "s" : ""} cast
            </div>
        </div>
    );
}

export default function PollsTab({ forumId, isAdmin }) {
    const [polls, setPolls] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showArchived, setShowArchived] = useState(false);

    useEffect(() => {
        fetchPolls();
    }, [forumId, showArchived]);

    const fetchPolls = async () => {
        try {
            setLoading(true);
            const res = await api.get(`forums/${forumId}/polls/`, {
                params: { archived: showArchived },
            });
            setPolls(Array.isArray(res.data) ? res.data : res.data.results || []);
        } catch (err) {
            console.error("Failed to load polls", err);
            setPolls([]);
        } finally {
            setLoading(false);
        }
    };

    const handleVote = (pollId) => {
        fetchPolls();
    };

    const handleArchive = (pollId) => {
        fetchPolls();
    };

    const handleCreateSuccess = () => {
        fetchPolls();
    };

    const displayPolls = polls.reduce((acc, poll) => {
        if (poll.status === "UPCOMING") acc.upcoming.push(poll);
        else if (poll.status === "ACTIVE") acc.active.push(poll);
        else acc.closed.push(poll);
        return acc;
    }, { upcoming: [], active: [], closed: [] });

    if (loading) {
        return <div className="text-center py-8 text-gray-500">Loading polls...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Polls</h2>
                {isAdmin && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        + Create Poll
                    </button>
                )}
            </div>

            {/* View Toggle */}
            <div className="flex gap-2">
                <button
                    onClick={() => setShowArchived(false)}
                    className={`px-4 py-2 rounded-lg transition ${!showArchived
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                >
                    Active Polls
                </button>
                <button
                    onClick={() => setShowArchived(true)}
                    className={`px-4 py-2 rounded-lg transition ${showArchived
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                >
                    Archived
                </button>
            </div>

            {/* Polls List */}
            {!showArchived && (
                <>
                    {/* Upcoming */}
                    {displayPolls.upcoming.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-gray-900">Upcoming Polls</h3>
                            <div className="space-y-3">
                                {displayPolls.upcoming.map(poll => (
                                    <PollCard
                                        key={poll.id}
                                        poll={poll}
                                        forumId={forumId}
                                        isAdmin={isAdmin}
                                        onVote={handleVote}
                                        onArchive={handleArchive}
                                        onRefresh={fetchPolls}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Active */}
                    {displayPolls.active.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-gray-900">Active Polls</h3>
                            <div className="space-y-3">
                                {displayPolls.active.map(poll => (
                                    <PollCard
                                        key={poll.id}
                                        poll={poll}
                                        forumId={forumId}
                                        isAdmin={isAdmin}
                                        onVote={handleVote}
                                        onArchive={handleArchive}
                                        onRefresh={fetchPolls}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Closed */}
                    {displayPolls.closed.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-gray-900">Closed Polls</h3>
                            <div className="space-y-3">
                                {displayPolls.closed.map(poll => (
                                    <PollCard
                                        key={poll.id}
                                        poll={poll}
                                        forumId={forumId}
                                        isAdmin={isAdmin}
                                        onVote={handleVote}
                                        onArchive={handleArchive}
                                        onRefresh={fetchPolls}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Archived Polls */}
            {showArchived && (
                <div>
                    <div className="space-y-3">
                        {polls.map(poll => (
                            <PollCard
                                key={poll.id}
                                poll={poll}
                                forumId={forumId}
                                isAdmin={isAdmin}
                                onVote={handleVote}
                                onArchive={handleArchive}
                                onRefresh={fetchPolls}
                            />
                        ))}
                    </div>
                    {polls.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            No archived polls
                        </div>
                    )}
                </div>
            )}

            {/* No Polls */}
            {polls.length === 0 && !showArchived && (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-500 mb-3">No polls yet</p>
                    {isAdmin && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="text-blue-600 hover:underline"
                        >
                            Create the first poll
                        </button>
                    )}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <CreatePollModal
                    forumId={forumId}
                    isAdmin={isAdmin}
                    onSuccess={handleCreateSuccess}
                    onClose={() => setShowCreateModal(false)}
                />
            )}
        </div>
    );
}
