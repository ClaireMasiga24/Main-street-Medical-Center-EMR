"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LaboratoryPage() {
  const router = useRouter();

  const [search, setSearch] = useState("");

  const handleLogout = () => {
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <main className="min-h-screen bg-[#f6faf7]">

      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white border-b border-green-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">

          <div className="flex items-center gap-3">
            <Image
              src="/Images/LOGO.jpg"
              alt="Main Street Medical Center"
              width={50}
              height={50}
              className="rounded-full"
              priority
            />

            <div>
              <h1 className="text-lg font-bold text-green-900">
                Main Street EMR
              </h1>

              <p className="text-sm text-gray-500">
                Laboratory Information System
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-5">

        {/* PAGE TITLE */}
        <section className="mb-6">
          <h2 className="text-3xl font-bold text-green-900">
            Laboratory Workspace
          </h2>

          <p className="text-gray-600 mt-2">
            Manage requests, process specimens, import analyzer results,
            validate reports and publish laboratory findings.
          </p>
        </section>

        {/* SEARCH */}
        <section className="bg-white rounded-3xl border border-green-100 p-5 mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Search Patient / Request / Specimen
          </label>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Patient number, specimen ID, test name..."
            className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-700"
          />
        </section>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* LEFT SIDE */}
          <div className="xl:col-span-2 space-y-6">

            {/* WORK QUEUE */}
            <section className="bg-white rounded-3xl border border-green-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-green-900">
                  Pending Laboratory Requests
                </h3>

                <button className="text-green-800 font-medium">
                  Refresh
                </button>
              </div>

              <div className="border-2 border-dashed border-green-200 rounded-2xl py-16 text-center">
                <p className="font-semibold text-gray-700">
                  No requests loaded
                </p>

                <p className="text-sm text-gray-500 mt-2">
                  Laboratory requests from the database will appear here.
                </p>
              </div>
            </section>

            {/* RESULTS ENTRY */}
            <section className="bg-white rounded-3xl border border-green-100 p-5">
              <h3 className="text-xl font-bold text-green-900 mb-4">
                Result Entry & Validation
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <input
                  placeholder="Patient Number"
                  className="border border-gray-300 rounded-2xl px-4 py-3"
                />

                <input
                  placeholder="Specimen ID"
                  className="border border-gray-300 rounded-2xl px-4 py-3"
                />

                <input
                  placeholder="Test Name"
                  className="border border-gray-300 rounded-2xl px-4 py-3"
                />

                <select className="border border-gray-300 rounded-2xl px-4 py-3 bg-white text-gray-900">
                  <option>Select Status</option>
                  <option>Pending</option>
                  <option>Processing</option>
                  <option>Completed</option>
                </select>
              </div>

              <textarea
                rows={6}
                placeholder="Enter laboratory findings and results..."
                className="mt-4 w-full border border-gray-300 rounded-2xl px-4 py-3"
              />

              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <button className="bg-green-800 text-white px-5 py-3 rounded-2xl font-semibold">
                  Save Draft
                </button>

                <button className="bg-green-600 text-white px-5 py-3 rounded-2xl font-semibold">
                  Verify Result
                </button>

                <button className="bg-blue-700 text-white px-5 py-3 rounded-2xl font-semibold">
                  Publish Report
                </button>
              </div>
            </section>

            {/* COMPLETED RESULTS */}
            <section className="bg-white rounded-3xl border border-green-100 p-5">
              <h3 className="text-xl font-bold text-green-900 mb-4">
                Completed Results
              </h3>

              <div className="border-2 border-dashed border-green-200 rounded-2xl py-16 text-center">
                <p className="font-semibold text-gray-700">
                  No completed reports available
                </p>

                <p className="text-sm text-gray-500 mt-2">
                  Verified laboratory reports will appear here.
                </p>
              </div>
            </section>

          </div>

          {/* RIGHT SIDE */}
          <div className="space-y-6">

            {/* ANALYZER IMPORT */}
            <section className="bg-white rounded-3xl border border-green-100 p-5">
              <h3 className="text-xl font-bold text-green-900 mb-4">
                Analyzer Import Center
              </h3>

              <input
                type="file"
                accept=".csv,.xlsx,.xls,.txt,.pdf"
                className="w-full border border-gray-300 rounded-2xl p-3"
              />

              <button className="w-full mt-4 bg-green-800 text-white py-3 rounded-2xl font-semibold">
                Import Results
              </button>

              <div className="mt-4 text-sm text-gray-600">
                Supported formats:
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="bg-green-50 px-3 py-1 rounded-full">
                    CSV
                  </span>
                  <span className="bg-green-50 px-3 py-1 rounded-full">
                    XLSX
                  </span>
                  <span className="bg-green-50 px-3 py-1 rounded-full">
                    TXT
                  </span>
                  <span className="bg-green-50 px-3 py-1 rounded-full">
                    PDF
                  </span>
                </div>
              </div>
            </section>

            {/* CRITICAL ALERTS */}
            <section className="bg-white rounded-3xl border border-green-100 p-5">
              <h3 className="text-xl font-bold text-green-900 mb-4">
                Critical Alerts
              </h3>

              <div className="border-2 border-dashed border-red-200 rounded-2xl py-10 text-center">
                <p className="font-semibold text-gray-700">
                  No active alerts
                </p>

                <p className="text-sm text-gray-500 mt-2">
                  Critical laboratory values will be displayed here.
                </p>
              </div>
            </section>

            {/* ACTIVITY */}
            <section className="bg-white rounded-3xl border border-green-100 p-5">
              <h3 className="text-xl font-bold text-green-900 mb-4">
                Laboratory Activity
              </h3>

              <div className="border-2 border-dashed border-green-200 rounded-2xl py-10 text-center">
                <p className="font-semibold text-gray-700">
                  No activity available
                </p>

                <p className="text-sm text-gray-500 mt-2">
                  Recent imports, verifications and publications will appear here.
                </p>
              </div>
            </section>

          </div>
        </div>
      </div>
    </main>
  );
}