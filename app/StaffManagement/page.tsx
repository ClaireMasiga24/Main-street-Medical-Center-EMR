"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Trash2, Eye, EyeOff, Pencil, Save, X, CheckCircle2,
  Key, Phone, User as UserIcon, Mail, Shield, Briefcase, Calendar,
  Search, Loader2, BadgeCheck, Clock,
} from "lucide-react";

type StaffMember = {
  id: number;
  username: string;
  role: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  department: string;
  specialization?: string;
  userId?: number;
  createdAt?: string;
};

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  ADMINISTRATOR: { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-200" },
  DOCTOR: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200" },
  DENTIST: { bg: "bg-cyan-100", text: "text-cyan-800", border: "border-cyan-200" },
  NURSE: { bg: "bg-pink-100", text: "text-pink-800", border: "border-pink-200" },
  NURSE_MIDWIFE: { bg: "bg-pink-100", text: "text-pink-800", border: "border-pink-200" },
  MIDWIFE: { bg: "bg-pink-100", text: "text-pink-800", border: "border-pink-200" },
  PHARMACIST: { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-200" },
  LAB_TECHNICIAN: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-200" },
  RECEPTIONIST: { bg: "bg-green-100", text: "text-green-800", border: "border-green-200" },
  CASHIER: { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-200" },
  SONOGRAPHER: { bg: "bg-teal-100", text: "text-teal-800", border: "border-teal-200" },
  RADIOLOGIST: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-200" },
  RADIOLOGIST_SONOGRAPHER: { bg: "bg-teal-100", text: "text-teal-800", border: "border-teal-200" },
  CLEANER: { bg: "bg-stone-100", text: "text-stone-800", border: "border-stone-200" },
};

const ROLE_ICON: Record<string, any> = {
  ADMINISTRATOR: Shield,
  DOCTOR: UserIcon,
  DENTIST: UserIcon,
  NURSE: UserIcon,
  NURSE_MIDWIFE: UserIcon,
  MIDWIFE: UserIcon,
  PHARMACIST: UserIcon,
  LAB_TECHNICIAN: UserIcon,
  RECEPTIONIST: UserIcon,
  CASHIER: UserIcon,
  SONOGRAPHER: UserIcon,
  RADIOLOGIST: UserIcon,
  RADIOLOGIST_SONOGRAPHER: UserIcon,
  CLEANER: UserIcon,
};

export default function StaffManagementPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  // ── Edit modal state ─────────────────────────────────────────────────
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editNewPassword, setEditNewPassword] = useState("");
  const [editShowNewPassword, setEditShowNewPassword] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

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
        setSelectedStaff(null);
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

  const openEditModal = (staff: StaffMember) => {
    setEditingStaff(staff);
    setEditUsername(staff.username);
    setEditPhone(staff.phoneNumber || "");
    setEditNewPassword("");
    setEditError(null);
    setEditSuccess(null);
    setEditShowNewPassword(false);
  };

  const handleEditSave = async () => {
    if (!editingStaff) return;
    setEditSaving(true);
    setEditError(null);
    setEditSuccess(null);
    try {
      const payload: any = { id: editingStaff.id };
      if (editUsername !== editingStaff.username) payload.username = editUsername;
      if (editPhone !== (editingStaff.phoneNumber || "")) payload.phoneNumber = editPhone;
      if (editNewPassword) payload.newPassword = editNewPassword;

      if (Object.keys(payload).length <= 1) {
        setEditError("No changes to save.");
        setEditSaving(false);
        return;
      }

      const res = await fetch("/api/staffupdate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        const msg = editNewPassword
          ? `Staff updated successfully! New password: ${editNewPassword}`
          : "Staff updated successfully!";
        setEditSuccess(msg);
        setEditNewPassword("");
        // Refresh the staff list and update selected staff
        fetchStaff();
        if (selectedStaff?.id === editingStaff.id) {
          setSelectedStaff((prev) =>
            prev ? { ...prev, username: editUsername, phoneNumber: editPhone } : prev
          );
        }
      } else {
        setEditError(data.message || "Failed to update staff.");
      }
    } catch {
      setEditError("Network error. Please try again.");
    } finally {
      setEditSaving(false);
    }
  };

  const uniqueRoles = new Set(staffList.map((s) => s.role)).size;
  const roles = ["ALL", ...new Set(staffList.map((s) => s.role))];

  const filteredStaff = staffList.filter(
    (s) =>
      (roleFilter === "ALL" || s.role === roleFilter) &&
      (s.username.toLowerCase().includes(search.toLowerCase()) ||
        s.fullName.toLowerCase().includes(search.toLowerCase()) ||
        s.role.toLowerCase().includes(search.toLowerCase()))
  );

  if (!user)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[#00703C]" />
        <span className="ml-3 text-sm text-slate-500">Loading...</span>
      </div>
    );

  return (
    <main className="min-h-screen bg-[#f4f7f5] antialiased">
      {/* HEADER */}
      <div className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 md:px-8 flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition">
            <ArrowLeft size={18} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">Staff Management</h1>
            <p className="text-xs text-slate-500">Main Street Medical Center · Admin Panel</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 space-y-6">
        {/* STATS CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Staff", value: staffList.length, icon: UserIcon, color: "bg-emerald-50 text-emerald-600", border: "border-emerald-100" },
            { label: "Roles", value: uniqueRoles, icon: Shield, color: "bg-blue-50 text-blue-600", border: "border-blue-100" },
            { label: "Active Today", value: staffList.length, icon: BadgeCheck, color: "bg-violet-50 text-violet-600", border: "border-violet-100" },
            { label: "Departments", value: new Set(staffList.map((s) => s.department)).size, icon: Briefcase, color: "bg-amber-50 text-amber-600", border: "border-amber-100" },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-2xl border ${stat.border} bg-white p-5 shadow-sm`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{stat.label}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                  <stat.icon size={18} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* TOOLBAR */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <button
            onClick={() => { setFormOpen(!formOpen); setError(null); }}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all ${formOpen ? "bg-slate-200 text-slate-600" : "bg-[#00703C] text-white hover:bg-emerald-800"}`}
          >
            {formOpen ? "Cancel" : "+ Add New Staff"}
          </button>
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, username, or role..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-xs font-medium outline-none focus:border-[#00703C] transition" />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium outline-none focus:border-[#00703C] transition">
            <option value="ALL">All Roles</option>
            {roles.filter(r => r !== "ALL").map((r) => (
              <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
            ))}
          </select>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">{filteredStaff.length} of {staffList.length}</span>
        </div>

        {/* ADD STAFF FORM */}
        {formOpen && (
          <form onSubmit={handleAddStaff} className="bg-white p-6 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 shadow-sm">
            {error && (
              <div className="md:col-span-2 bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-4 py-3 rounded-xl">{error}</div>
            )}
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Full Name *</label>
              <input required placeholder="e.g., Dr. John Okello" value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium outline-none focus:border-[#00703C]" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Username *</label>
              <input required placeholder="e.g., jokello" value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium outline-none focus:border-[#00703C]" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Email *</label>
              <input required type="email" placeholder="e.g., john@mainstreet.com" value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium outline-none focus:border-[#00703C]" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Password *</label>
              <div className="relative">
                <input required type={showPassword ? "text" : "password"} placeholder="Min 6 characters" value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium outline-none focus:border-[#00703C] pr-9" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Role *</label>
              <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium outline-none bg-white focus:border-[#00703C]">
                {["ADMINISTRATOR","DOCTOR","DENTIST","NURSE_MIDWIFE","LAB_TECHNICIAN","RADIOLOGIST_SONOGRAPHER","CLEANER","RECEPTIONIST","CASHIER","PHARMACIST"].map(r => (
                  <option key={r} value={r}>{r === "RADIOLOGIST_SONOGRAPHER" ? "RADIOLOGIST/SONOGRAPHER" : r.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Department *</label>
              <input required placeholder="e.g., Internal Medicine" value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium outline-none focus:border-[#00703C]" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Phone Number</label>
              <input placeholder="e.g., 0770000000" value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium outline-none focus:border-[#00703C]" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Specialization</label>
              <input placeholder="e.g., Cardiologist" value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium outline-none focus:border-[#00703C]" />
            </div>
            <button type="submit" disabled={submitting}
              className="md:col-span-2 bg-[#00703C] text-white py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider hover:bg-emerald-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><CheckCircle2 size={14} /> Save Staff Member</>}
            </button>
          </form>
        )}

        {/* STAFF CARDS GRID */}
        {filteredStaff.length === 0 ? (
          <div className="text-center py-16">
            <UserIcon size={48} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-sm font-bold text-slate-500">No staff members found</h3>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search or add a new staff member above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredStaff.map((s) => {
              const colors = ROLE_COLORS[s.role] ?? { bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-200" };
              const Icon = ROLE_ICON[s.role] ?? UserIcon;
              const isSelected = selectedStaff?.id === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedStaff(isSelected ? null : s)}
                  className={`rounded-2xl border-2 bg-white p-5 cursor-pointer transition-all shadow-sm hover:shadow-md ${
                    isSelected ? "border-[#00703C]" : "border-slate-100 hover:border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center ${colors.text}`}>
                      <Icon size={22} />
                    </div>
                    <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
                      {s.role.replace(/_/g, " ")}
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 truncate">{s.fullName}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">@{s.username}</p>
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                    <Briefcase size={11} />
                    <span className="truncate">{s.department}</span>
                  </div>
                  {s.specialization && (
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                      <BadgeCheck size={11} />
                      <span className="truncate">{s.specialization}</span>
                    </div>
                  )}
                  {isSelected && (
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <Mail size={11} className="flex-shrink-0" />
                        <span className="truncate">{s.email}</span>
                      </div>
                      {s.phoneNumber && (
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <Phone size={11} className="flex-shrink-0" />
                          <span>{s.phoneNumber}</span>
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        <button onClick={(e) => { e.stopPropagation(); openEditModal(s); }}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[#00703C] text-white py-2 text-[10px] font-extrabold uppercase tracking-wider hover:bg-emerald-800 transition">
                          <Pencil size={12} /> Edit
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(s); }}
                          className="flex items-center justify-center gap-1.5 rounded-lg bg-red-50 text-red-600 border border-red-100 py-2 px-3 text-[10px] font-extrabold uppercase tracking-wider hover:bg-red-100 transition">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-slate-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <Pencil size={14} /> Edit Staff
              </h3>
              <button onClick={() => setEditingStaff(null)} className="text-white/60 hover:text-white transition">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Staff identity */}
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">
                  {editingStaff.fullName.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{editingStaff.fullName}</p>
                  <p className="text-[10px] text-slate-400">{editingStaff.role.replace(/_/g, " ")} · {editingStaff.department}</p>
                </div>
              </div>

              {editSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-4 py-3 rounded-xl">
                  <CheckCircle2 size={14} className="inline mr-1.5" />{editSuccess}
                </div>
              )}

              {editError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-4 py-3 rounded-xl">{editError}</div>
              )}

              {/* Username */}
              <div>
                <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Username</label>
                <div className="relative">
                  <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={editUsername}
                    onChange={(e) => { setEditUsername(e.target.value); setEditSuccess(null); }}
                    className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2.5 text-xs font-medium outline-none focus:border-[#00703C]" />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Phone Number</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={editPhone}
                    onChange={(e) => { setEditPhone(e.target.value); setEditSuccess(null); }}
                    className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2.5 text-xs font-medium outline-none focus:border-[#00703C]" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  New Password <span className="text-slate-300 font-normal normal-case">(leave blank to keep current)</span>
                </label>
                <div className="relative">
                  <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type={editShowNewPassword ? "text" : "password"} value={editNewPassword}
                    onChange={(e) => { setEditNewPassword(e.target.value); setEditSuccess(null); }}
                    placeholder="Enter new password..."
                    className="w-full rounded-xl border border-slate-200 pl-9 pr-9 py-2.5 text-xs font-medium outline-none focus:border-[#00703C]" />
                  <button type="button" onClick={() => setEditShowNewPassword(!editShowNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {editShowNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {editNewPassword && editShowNewPassword && (
                  <p className="mt-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1 inline-block">
                    Password will be set to: <span className="font-mono">{editNewPassword}</span>
                  </p>
                )}
              </div>

              {/* Info text */}
              <p className="text-[9px] text-slate-400 italic">
                Passwords are encrypted and cannot be retrieved. Set a new password above and copy it before closing.
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-5">
              <button onClick={() => setEditingStaff(null)}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">
                Close
              </button>
              <button onClick={handleEditSave} disabled={editSaving}
                className="flex-1 rounded-xl bg-[#00703C] py-3 text-xs font-extrabold text-white hover:bg-emerald-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {editSaving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Save size={14} /> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-extrabold text-slate-800 mb-2">Remove Staff Member</h2>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to remove{" "}
              <span className="font-bold text-slate-800">{deleteTarget.fullName}</span>?
              This will also delete their login account permanently.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-xs font-extrabold hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {deleting ? <><Loader2 size={14} className="animate-spin" /> Removing...</> : <><Trash2 size={14} /> Yes, Remove</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
