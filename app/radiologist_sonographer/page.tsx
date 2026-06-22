"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search,
  Bell,
  LogOut,
  Scan,
  User,
  FileText,
} from "lucide-react";

export default function ImagingDashboard() {
  const router = useRouter();

  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-[#008C45] text-white flex flex-col shadow-xl">
        {/* Logo */}
        <div className="border-b border-white/20 p-6">
          <div className="flex items-center gap-4">
            <Image
              src="/Images/LOGO.jpg"
              alt="Logo"
              width={60}
              height={60}
              className="rounded-full bg-white p-1"
            />

            <div>
              <h1 className="font-bold text-lg">
                Main Street
              </h1>

              <p className="text-sm text-green-100">
                Imaging Department
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-4 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/15">
            <Scan size={18} />
            Dashboard
          </button>

          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition">
            <User size={18} />
            Patient Queue
          </button>

          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition">
            <FileText size={18} />
            Reports
          </button>
        </div>

        {/* User Section */}
        <div className="mt-auto p-4">
          <div className="bg-white/10 rounded-xl p-4 mb-3">
            <p className="font-medium">
              Sonography & Radiology
            </p>

            <p className="text-xs text-green-100">
              Logged In
            </p>
          </div>

          <button
            onClick={() => router.push("/")}
            className="w-full bg-red-500 hover:bg-red-600 transition rounded-xl py-3 flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b px-8 py-5 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Imaging Dashboard
            </h1>

            <p className="text-slate-500">
              Sonography & Radiology Department
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-3 text-slate-400"
              />

              <input
                placeholder="Search patients..."
                className="pl-10 pr-4 py-2.5 border rounded-xl w-72 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <button className="h-11 w-11 bg-slate-100 rounded-xl flex items-center justify-center">
              <Bell size={18} />
            </button>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-6 p-6">
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-slate-500 text-sm">
              Waiting Patients
            </p>

            <h2 className="text-3xl font-bold mt-2">
              0
            </h2>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-slate-500 text-sm">
              Completed Today
            </p>

            <h2 className="text-3xl font-bold mt-2">
              0
            </h2>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-slate-500 text-sm">
              Ultrasounds
            </p>

            <h2 className="text-3xl font-bold mt-2">
              0
            </h2>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-slate-500 text-sm">
              X-Rays
            </p>

            <h2 className="text-3xl font-bold mt-2">
              0
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 grid grid-cols-12 gap-6 px-6 pb-6">
          {/* Queue */}
          <div className="col-span-4 bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b">
              <h2 className="font-bold text-lg">
                Patient Queue
              </h2>
            </div>

            <div className="h-[650px] overflow-y-auto">
              <div className="flex items-center justify-center h-full text-slate-400">
                No patients awaiting imaging
              </div>
            </div>
          </div>

          {/* Patient Details */}
          <div className="col-span-8 flex flex-col gap-6">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-bold text-lg mb-4">
                Patient Information
              </h2>

              {selectedPatient ? (
                <div>
                  Patient Details Here
                </div>
              ) : (
                <div className="text-slate-400">
                  Select a patient from the queue
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6 flex-1">
              <h2 className="font-bold text-lg mb-4">
                Imaging Report
              </h2>

              <textarea
                className="w-full h-[350px] border rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter imaging findings..."
              />

              <div className="flex justify-end mt-4">
                <button className="bg-[#008C45] hover:bg-[#00773a] text-white px-8 py-3 rounded-xl font-medium">
                  Save Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}