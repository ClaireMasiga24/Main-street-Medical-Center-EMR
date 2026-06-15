"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X, Trash2, Users, ClipboardList, Microscope } from "lucide-react";

type Status = "idle" | "loading" | "success" | "error";

const ROLES = [
  { value: "ADMINISTRATOR", label: "ADMINISTRATOR" },
  { value: "DOCTOR", label: "Doctor" },
  { value: "NURSE", label: "Nurse / Midwife" },
  { value: "PHARMACIST", label: "Pharmacist" },
  { value: "LAB_TECHNICIAN", label: "LAB_TECHNICIAN" },
  { value: "RECEPTIONIST", label: "Receptionist" },
  { value: "BILLING_OFFICER", label: "Billing Officer" },
];

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  ADMINISTRATOR: { bg: "bg-indigo-100", text: "text-indigo-800" },
  DOCTOR: { bg: "bg-blue-100", text: "text-blue-800" },
  NURSE: { bg: "bg-pink-100", text: "text-pink-800" },
  PHARMACIST: { bg: "bg-purple-100", text: "text-purple-800" },
  LAB_TECHNICIAN: { bg: "bg-yellow-100", text: "text-yellow-800" },
  RECEPTIONIST: { bg: "bg-green-100", text: "text-green-800" },
  BILLING_OFFICER: { bg: "bg-red-100", text: "text-red-800" },
};

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

export default function StaffManagementPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (!storedUser) { router.push("/"); return; }
    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== "ADMINISTRATOR") { router.push("/"); return; }
    setUser(parsedUser);
    fetchStaff();
  }, [router]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStaff = async () => {
    const res = await fetch("/api/staffcreate");
    const data = await res.json();
    if (data.success) setStaffList(data.staff);
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    const res = await fetch("/api/staffcreate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, username, email, password, role, department, phoneNumber, specialization }),
    });
    const data = await res.json();
    if (data.success) {
      setStatus("idle");
      setFullName(""); setUsername(""); setEmail(""); setPassword(""); setRole(""); setDepartment(""); setPhoneNumber(""); setSpecialization("");
      setFormOpen(false); fetchStaff();
      showToast(`${fullName} added successfully!`);
    } else {
      setStatus("error");
      showToast(data.message || "Something went wrong", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch("/api/staffdelete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deleteTarget.id }),
    });
    const data = await res.json();
    if (data.success) {
      setDeleteTarget(null); fetchStaff();
      showToast(`${deleteTarget.username} removed`);
    } else {
      showToast("Failed to remove staff member", "error");
    }
  };

  const filtered = staffList.filter(s =>
    s.username.toLowerCase().includes(search.toLowerCase()) ||
    s.role.toLowerCase().includes(search.toLowerCase())
  );

  const uniqueRoles = new Set(staffList.map(s => s.role)).size;

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-gray-100">Loading...</div>;

  return (
    <main className="min-h-screen bg-[#f4f7f5] px-4 py-6 md:px-8 md:py-8">
      {/* DELETE MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Remove staff member?</h2>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 border border-gray-200 rounded-xl py-3 text-gray-600 font-medium text-sm">Cancel</button>
              <button onClick={handleDelete} className="flex-1 bg-red-600 text-white rounded-xl py-3 font-medium text-sm">Yes, remove</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push("/dashboard")} className="w-9 h-9 bg-white border border-gray-200 rounded-xl flex items-center justify-center"><ArrowLeft size={18} /></button>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Staff Management</h1>
          <p className="text-gray-500 text-sm">Main Street Medical Center</p>
        </div>
      </div>

      {/* QUICK NAVIGATION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <button onClick={() => router.push("/nurse-midwife")} className="w-full bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between hover:border-green-200 transition cursor-pointer">
          <span className="font-semibold text-gray-700 text-sm">Nurses & Midwives</span>
          <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-pink-700"><Users size={16} /></div>
        </button>
        <button onClick={() => router.push("/receptionist")} className="w-full bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between hover:border-green-200 transition cursor-pointer">
          <span className="font-semibold text-gray-700 text-sm">Reception</span>
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700"><ClipboardList size={16} /></div>
        </button>
        <button onClick={() => router.push("/laboratory")} className="w-full bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between hover:border-green-200 transition cursor-pointer">
          <span className="font-semibold text-gray-700 text-sm">Laboratory</span>
          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-700"><Microscope size={16} /></div>
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[ { label: "Total staff", value: staffList.length }, { label: "Roles", value: uniqueRoles }, { label: "Active", value: staffList.length } ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 text-center border border-gray-100">
            <div className="text-2xl font-bold text-gray-800">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ADD STAFF */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">All staff</h2>
        <button onClick={() => setFormOpen(!formOpen)} className="bg-green-800 text-white px-4 py-2 rounded-xl text-sm font-medium">{formOpen ? "Cancel" : "Add staff"}</button>
      </div>

      <input type="text" placeholder="Search by username or role..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full border border-gray-200 bg-white rounded-xl px-4 py-3 text-sm mb-4" />
      
      <div className="space-y-3">
        {filtered.map((s) => (
          <div key={s.id} className="bg-white border border-gray-100 rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">{s.username}</p>
              <span className={`inline-block text-xs px-2 rounded-full ${ROLE_COLORS[s.role]?.bg} ${ROLE_COLORS[s.role]?.text}`}>{s.role}</span>
            </div>
            <button onClick={() => setDeleteTarget(s)} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
    </main>
  );
}