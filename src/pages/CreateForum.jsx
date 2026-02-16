import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function CreateForum() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        address: "",
        email: "",
        phone: "",
    });
    const [profilePicture, setProfilePicture] = useState(null);
    const [profilePicturePreview, setProfilePicturePreview] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [successForum, setSuccessForum] = useState(null);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        setProfilePicture(file);

        if (file) {
            const url = URL.createObjectURL(file);
            setProfilePicturePreview(url);
        } else {
            setProfilePicturePreview(null);
        }
    };

    const validateForm = () => {
        const { name, description, address, email, phone } = formData;
        if (!name || !description || !address || !email || !phone) {
            setError("All fields are required.");
            return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError("Invalid email address.");
            return false;
        }
        if (!/^[0-9+\-\s()]+$/.test(phone)) {
            setError("Invalid phone number.");
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            const data = new FormData();
            data.append("name", formData.name);
            data.append("description", formData.description);
            data.append("address", formData.address);
            data.append("email", formData.email);
            data.append("phone", formData.phone);
            if (profilePicture) {
                data.append("profile_picture", profilePicture);
            }

            const response = await api.post("forums/create/", data, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            // Forum created successfully - show success screen with forum_id
            setSuccessForum(response.data);
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to create forum.");
        } finally {
            setLoading(false);
        }
    };

    // Success screen after forum creation
    if (successForum) {
        return (
            <div className="min-h-screen bg-primary flex items-center justify-center px-4 py-8">
                <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl text-center">
                    <div className="mb-6">
                        <div className="inline-block bg-green-100 rounded-full p-3 mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-secondary mb-2">Forum Created Successfully!</h1>
                    </div>

                    <div className="bg-blue-50 border-2 border-primary rounded-lg p-6 mb-6">
                        <p className="text-sm text-gray-600 mb-2">Your Forum ID:</p>
                        <p className="text-2xl font-mono font-bold text-primary mb-3">{successForum.forum_id}</p>
                        <p className="text-sm text-gray-600 mb-4">Share this ID with others so they can join your forum</p>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(successForum.forum_id);
                                alert("Forum ID copied to clipboard!");
                            }}
                            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition text-sm font-medium"
                        >
                            📋 Copy Forum ID
                        </button>
                    </div>

                    <div className="mb-6">
                        <h2 className="text-lg font-semibold text-secondary mb-4">Forum Details:</h2>
                        <div className="text-left bg-gray-50 rounded-lg p-4 space-y-2">
                            <p><span className="font-semibold">Name:</span> {successForum.name}</p>
                            <p><span className="font-semibold">Email:</span> {successForum.email}</p>
                            <p><span className="font-semibold">Address:</span> {successForum.address}</p>
                        </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-6">
                        You can now complete your forum profile with additional details like constitution, objectives, and more.
                    </p>

                    <div className="flex gap-3">
                        <button
                            onClick={() => navigate("/dashboard")}
                            className="flex-1 bg-secondary text-white py-3 rounded-lg font-medium hover:bg-accent transition"
                        >
                            Go to Dashboard
                        </button>
                        <button
                            onClick={() => setSuccessForum(null)}
                            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
                        >
                            Create Another
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-primary flex items-center justify-center px-4 py-8">
            <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl">
                <h1 className="text-2xl font-bold text-secondary mb-2">Create a Forum</h1>
                <p className="text-sm text-gray-500 mb-6">
                    Provide basic information to create your forum. You can complete your forum profile later.
                </p>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-secondary mb-1">
                                Forum Name *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder="Enter forum name"
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-secondary mb-1">
                                Email *
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="Enter contact email"
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-secondary mb-1">
                                Phone Number *
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                placeholder="Enter contact phone"
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-secondary mb-1">
                                Address *
                            </label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleInputChange}
                                placeholder="Enter forum address"
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-secondary mb-1">
                            Forum Description *
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            placeholder="Describe your forum's purpose and goals"
                            rows="4"
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-secondary mb-1">
                            Forum Profile Picture
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="w-full"
                        />
                        {profilePicturePreview && (
                            <img
                                src={profilePicturePreview}
                                alt="preview"
                                className="mt-3 w-24 h-24 object-cover rounded-lg border"
                            />
                        )}
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-secondary text-white py-3 rounded-lg font-medium hover:bg-accent transition disabled:opacity-50"
                        >
                            {loading ? "Creating..." : "Create Forum"}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate("/dashboard")}
                            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
