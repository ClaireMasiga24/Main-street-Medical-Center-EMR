"use client";

import { useState } from "react";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  Pill,
  Settings,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  Activity,
} from "lucide-react";

export default function DentistDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const logout = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/login";
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-72" : "w-20"
        } transition-all duration-300 bg-[#008C45] text-white flex flex-col shadow-2xl`}
      >
        <div className="p-5 border-b border-white/20">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div className="flex items-center gap-3">
                <Image
                  src="/Images/LOGO.jpg"
                  alt="Main Street Medical Center"
                  width={55}
                  height={55}
                  className="rounded-full bg-white p-1"
                />

                <div>
                  <h2 className="font-bold text-lg">
                    Main Street
                  </h2>
                  <p className="text-xs text-green-100">
                    Dental Department
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hover:bg-white/10 p-2 rounded-lg"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <SidebarItem
            icon={<LayoutDashboard size={20} />}
            label="Dashboard"
            open={sidebarOpen}
          />

          <SidebarItem
            icon={<Users size={20} />}
            label="Patient Queue"
            open={sidebarOpen}
          />

          <SidebarItem
            icon={<Activity size={20} />}
            label="Consultations"
            open={sidebarOpen}
          />

          <SidebarItem
            icon={<CalendarDays size={20} />}
            label="Appointments"
            open={sidebarOpen}
          />

          <SidebarItem
            icon={<Pill size={20} />}
            label="Prescriptions"
            open={sidebarOpen}
          />

          <SidebarItem
            icon={<FileText size={20} />}
            label="Clinical Notes"
            open={sidebarOpen}
          />

          <SidebarItem
            icon={<Settings size={20} />}
            label="Settings"
            open={sidebarOpen}
          />
        </nav>

        <div className="p-4 border-t border-white/20">
          <button
            onClick={logout}
            className="w-full bg-red-500 hover:bg-red-600 transition rounded-xl py-3 flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            {sidebarOpen && "Logout"}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Dentist Workspace
            </h1>

            <p className="text-slate-500">
              Main Street Medical Center
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-3 text-slate-400"
              />

              <input
                placeholder="Search patient..."
                className="border rounded-xl pl-10 pr-4 py-2 w-80 outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <button className="relative p-3 border rounded-xl">
              <Bell size={20} />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 p-8 overflow-auto">
          <div className="grid xl:grid-cols-4 gap-6">
            {/* Queue */}
            <div className="xl:col-span-3">
              <div className="bg-white rounded-2xl shadow-sm border">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-semibold">
                    Patient Queue
                  </h2>

                  <p className="text-slate-500 text-sm mt-1">
                    Patients sent by reception and awaiting consultation
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600">
                        <th className="text-left p-4">
                          Visit No
                        </th>
                        <th className="text-left p-4">
                          Patient
                        </th>
                        <th className="text-left p-4">
                          Complaint
                        </th>
                        <th className="text-left p-4">
                          Time
                        </th>
                        <th className="text-left p-4">
                          Status
                        </th>
                        <th className="text-right p-4">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      <tr>
                        <td
                          colSpan={6}
                          className="text-center py-20 text-slate-400"
                        >
                          No patients currently in queue
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Consultation */}
              <div className="mt-6 bg-white rounded-2xl border shadow-sm">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-semibold">
                    Consultation Workspace
                  </h2>

                  <p className="text-slate-500 text-sm">
                    Select a patient from the queue
                  </p>
                </div>

                <div className="p-12 text-center text-slate-400">
                  No active consultation selected
                </div>
              </div>
            </div>

            {/* Right Panel */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border p-6">
                <h3 className="font-semibold text-lg mb-4">
                  Clinical Alerts
                </h3>

                <div className="text-slate-400 text-sm">
                  No active alerts
                </div>
              </div>

              <div className="bg-white rounded-2xl border p-6">
                <h3 className="font-semibold text-lg mb-4">
                  Today's Summary
                </h3>

                <div className="space-y-4">
                  <SummaryItem
                    title="Patients Seen"
                    value="0"
                  />

                  <SummaryItem
                    title="Pending Queue"
                    value="0"
                  />

                  <SummaryItem
                    title="Procedures"
                    value="0"
                  />

                  <SummaryItem
                    title="Prescriptions"
                    value="0"
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl border p-6">
                <h3 className="font-semibold text-lg mb-4">
                  Odontogram
                </h3>

                <div className="grid grid-cols-8 gap-2 text-center text-xs">
                  {[
                    "18",
                    "17",
                    "16",
                    "15",
                    "14",
                    "13",
                    "12",
                    "11",
                    "21",
                    "22",
                    "23",
                    "24",
                    "25",
                    "26",
                    "27",
                    "28",
                  ].map((tooth) => (
                    <button
                      key={tooth}
                      className="h-10 rounded-lg border hover:border-green-600"
                    >
                      {tooth}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarItem({
  icon,
  label,
  open,
}: {
  icon: React.ReactNode;
  label: string;
  open: boolean;
}) {
  return (
    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition">
      {icon}
      {open && <span>{label}</span>}
    </button>
  );
}

function SummaryItem({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{title}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}