"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Eye, EyeOff } from "lucide-react";

type StaffMember = {
  id: number;
  username: string;
  role: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  department: string;
  specialization?: string;
};

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  ADMINISTRATOR: { bg: "bg-indigo-100", text: "text-indigo-800" },
  DOCTOR: { bg: "bg-blue-100", text: "text-blue-800" },
  NURSE: { bg: "bg-pink-100", text: "text-pink-800" },
  MIDWIFE: { bg: "bg-pink-100", text: "text-pink-800" },
  PHARMACIST: { bg: "bg-purple-100", text: "text-purple-800" },
  LAB_TECHNICIAN: { bg: "bg-yellow-100", text: "text-yellow-800" },
  RECEPTIONIST: { bg: "bg-green-100", text: "text-green-800" },
  CASHIER: { bg: "bg-gray-100", text: "text-gray-800" },
  SONOGRAPHER: { bg: "bg-teal-100", text: "text-teal-800" },
  RADIOLOGIST: { bg: "bg-orange-100", text: "text-orange-800" },
};

export default function StaffManagementPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    role: "DOCTOR",
    department: "",
    phoneNumber: "",
    specialization: "",
  });

  const fetchStaff = useCallback(async () => {
    const res = await fetch("/api/staffcreate");
    const data = await res.json();
    if (data.success) setStaffList(data.staff);
  }, []);

  useEffect(() => {
    const storedUser =
      localStorage.getItem("user") || sessionStorage.getItem("user");
    if (!storedUser) {
      router.push("/");
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== "ADMINISTRATOR") {
      router.push("/");
      return;
    }
    setUser(parsedUser);
    fetchStaff();
  }, [router, fetchStaff]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/staffcreate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setFormOpen(false);
        setFormData({
          fullName: "",
          username: "",
          email: "",
          password: "",
          role: "DOCTOR",
          department: "",
          phoneNumber: "",
          specialization: "",
        });
        fetchStaff();
      } else {
        setError(data.message || "Failed to create staff member.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ ONLY FIX: send id in body to match your route's req.json()
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/staffdelete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const data = await res.json();
      if (data.success) {
        setDeleteTarget(null);
        fetchStaff();
      } else {
        alert(data.message || "Failed to delete staff member.");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const uniqueRoles = new Set(staffList.map((s) => s.role)).size;

  if (!user)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );

  return (
    <main className="min-h-screen bg-[#f4f7f5] px-4 py-8 md:px-8">
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 bg-white border rounded-xl"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Staff Management</h1>
          <p className="text-sm text-gray-500">Main Street Medical Center</p>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: "Total Staff", value: staffList.length },
          { label: "Roles", value: uniqueRoles },
          { label: "Active", value: staffList.length },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-2xl p-4 text-center border border-gray-100 shadow-sm"
          >
            <div className="text-2xl font-bold text-gray-800">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ADD STAFF */}
      <div className="mb-6">
        <button
          onClick={() => {
            setFormOpen(!formOpen);
            setError(null);
          }}
          className="bg-green-800 text-white px-6 py-2 rounded-xl text-sm font-medium"
        >
          {formOpen ? "Cancel" : "Add New Staff"}
        </button>

        {formOpen && (
          <form
            onSubmit={handleAddStaff}
            className="mt-4 bg-white p-6 rounded-2xl border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4 shadow-sm"
          >
            {error && (
              <div className="md:col-span-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <input
              required
              placeholder="Full Name"
              value={formData.fullName}
              className="p-3 border rounded-xl"
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
            />
            <input
              required
              placeholder="Username"
              value={formData.username}
              className="p-3 border rounded-xl"
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
            />
            <input
              required
              type="email"
              placeholder="Email"
              value={formData.email}
              className="p-3 border rounded-xl"
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
            <div className="relative">
              <input
                required
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={formData.password}
                className="w-full p-3 border rounded-xl"
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-gray-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <select
              value={formData.role}
              className="p-3 border rounded-xl"
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
            >
              <option value="ADMINISTRATOR">Administrator</option>
              <option value="DOCTOR">Doctor</option>
              <option value="NURSE_MIDWIFE">Nurse/Midwife</option>
      
              <option value ="DENTIST">DENTIST</option>
              <option value="LAB_TECHNICIAN">Lab Technician</option>
              <option value="SONOGRAPHER">Sonographer</option>
              <option value="RADIOLOGIST">Radiologist</option>
              <option value="RECEPTIONIST">Receptionist</option>
              <option value="CASHIER">Cashier</option>
              <option value="PHARMACIST">Pharmacist</option>
            </select>

            <input
              required
              placeholder="Department"
              value={formData.department}
              className="p-3 border rounded-xl"
              onChange={(e) =>
                setFormData({ ...formData, department: e.target.value })
              }
            />
            <input
              placeholder="Phone Number"
              value={formData.phoneNumber}
              className="p-3 border rounded-xl"
              onChange={(e) =>
                setFormData({ ...formData, phoneNumber: e.target.value })
              }
            />
            <input
              placeholder="Specialization"
              value={formData.specialization}
              className="p-3 border rounded-xl"
              onChange={(e) =>
                setFormData({ ...formData, specialization: e.target.value })
              }
            />

            <button
              type="submit"
              disabled={submitting}
              className="md:col-span-2 bg-green-800 text-white py-3 rounded-xl font-bold disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save Staff Member"}
            </button>
          </form>
        )}
      </div>

      {/* SEARCH */}
      <input
        type="text"
        placeholder="Search by username or role..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full p-3 border rounded-xl mb-4 bg-white"
      />

      {/* LIST */}
      <div className="space-y-3">
        {staffList
          .filter(
            (s) =>
              s.username.toLowerCase().includes(search.toLowerCase()) ||
              s.role.toLowerCase().includes(search.toLowerCase())
          )
          .map((s) => (
            <div
              key={s.id}
              className="bg-white border rounded-2xl p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-gray-800">{s.username}</p>
                <p className="text-xs text-gray-400">{s.fullName} · {s.department}</p>
                <span
                  className={`inline-block text-xs px-2 mt-1 rounded-full ${
                    ROLE_COLORS[s.role]?.bg ?? "bg-gray-100"
                  } ${ROLE_COLORS[s.role]?.text ?? "text-gray-800"}`}
                >
                  {s.role}
                </span>
              </div>
              <button
                onClick={() => setDeleteTarget(s)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}

        {staffList.length === 0 && (
          <div className="text-center text-gray-400 py-12 text-sm">
            No staff members yet. Add one above.
          </div>
        )}
      </div>

      {/* DELETE MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-gray-800 mb-2">
              Remove Staff Member
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to remove{" "}
              <span className="font-semibold text-gray-800">
                {deleteTarget.fullName}
              </span>
              ? This will also delete their login account.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 border rounded-xl text-sm text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold disabled:opacity-60"
              >
                {deleting ? "Removing..." : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}