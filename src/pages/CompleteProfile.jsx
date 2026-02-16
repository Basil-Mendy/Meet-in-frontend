import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function CompleteProfile() {
  const navigate = useNavigate();

  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [nationality, setNationality] = useState("");
  const [stateProv, setStateProv] = useState("");
  const [city, setCity] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validateRequired = () => {
    return (
      dob &&
      gender &&
      nationality &&
      stateProv &&
      city &&
      photoFile
    );
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setPhotoFile(f);

    if (f) {
      const url = URL.createObjectURL(f);
      setPhotoPreview(url);
    } else {
      setPhotoPreview(null);
    }
  };

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");

    if (!validateRequired()) {
      setError("Please fill all required fields before saving.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("date_of_birth", dob);
      formData.append("gender", gender);
      formData.append("middle_name", middleName);
      formData.append("nationality", nationality);
      formData.append("state", stateProv);
      formData.append("city", city);
      formData.append("photo", photoFile);

      await api.put("auth/profile/complete/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data || "Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => navigate("/dashboard");

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-4xl">
        <h2 className="text-xl font-bold text-secondary mb-2">Complete Your Profile</h2>

        <p className="text-sm text-gray-500 mb-4">Provide the required details below to complete your profile and prepare for verification.</p>

        {error && <p className="text-red-600 text-sm mb-3">{typeof error === 'string' ? error : JSON.stringify(error)}</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <form onSubmit={handleSubmit} className="space-y-4 md:col-span-2">
            <label className="text-sm">Date of birth *</label>
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} required className="w-full border rounded-lg px-4 py-2" />

            <label className="text-sm">Gender *</label>
            <select value={gender} onChange={(e) => setGender(e.target.value)} required className="w-full border rounded-lg px-4 py-2">
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>

            <input type="text" placeholder="Middle Name" value={middleName} onChange={(e) => setMiddleName(e.target.value)} className="w-full border rounded-lg px-4 py-2" />

            <input type="text" placeholder="Nationality *" value={nationality} onChange={(e) => setNationality(e.target.value)} required className="w-full border rounded-lg px-4 py-2" />

            <input type="text" placeholder="State / Province *" value={stateProv} onChange={(e) => setStateProv(e.target.value)} required className="w-full border rounded-lg px-4 py-2" />

            <input type="text" placeholder="City *" value={city} onChange={(e) => setCity(e.target.value)} required className="w-full border rounded-lg px-4 py-2" />

            <div>
              <label className="text-sm">Profile photo *</label>
              <input type="file" accept="image/*" onChange={handleFileChange} className="w-full mt-2" />

              {photoPreview && <img src={photoPreview} alt="preview" className="mt-2 w-24 h-24 object-cover rounded-full border" />}
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="flex-1 bg-secondary text-white py-2 rounded-lg hover:bg-accent transition disabled:opacity-50">{loading ? "Saving..." : "Save Profile"}</button>

              <button type="button" onClick={handleBack} className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition">Back to Dashboard</button>
            </div>
          </form>

          <aside className="md:col-span-1 bg-gray-50 border rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-3">Profile preview</h3>

            <div className="flex flex-col items-center gap-3">
              {photoPreview ? (
                <img src={photoPreview} alt="profile" className="w-40 h-40 object-cover rounded-full border" />
              ) : (
                <div className="w-40 h-40 bg-gray-200 rounded-full flex items-center justify-center text-gray-400">No photo</div>
              )}

              <div className="w-full">
                <p className="text-sm text-secondary"><strong>DOB:</strong> {dob || "—"}</p>
                <p className="text-sm text-secondary"><strong>Gender:</strong> {gender || "—"}</p>
                <p className="text-sm text-secondary"><strong>Middle Name:</strong> {middleName || "—"}</p>
                <p className="text-sm text-secondary"><strong>Nationality:</strong> {nationality || "—"}</p>
                <p className="text-sm text-secondary"><strong>State:</strong> {stateProv || "—"}</p>
                <p className="text-sm text-secondary"><strong>City:</strong> {city || "—"}</p>
              </div>

              <div className="w-full mt-2">
                <button onClick={handleSubmit} disabled={loading} className="w-full bg-primary text-white py-2 rounded-lg hover:bg-accent transition disabled:opacity-50">{loading ? "Submitting..." : "Submit Profile"}</button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
