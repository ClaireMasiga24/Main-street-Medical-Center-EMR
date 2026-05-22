"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const navItems = [
  "Dashboard",
  "Patient Records",
  "Appointments",
  "Laboratory",
  "Pharmacy",
  "Billing",
  "Staff Management",
  "Settings",
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("Dashboard");

  useEffect(() => {
    const storedUser =
      localStorage.getItem("user") ||
      sessionStorage.getItem("user");

    if (!storedUser) {
      router.push("/");
      return;
    }

    const parsedUser = JSON.parse(storedUser);

    if (parsedUser.role !== "Administrator") {
      alert("Access denied. Administrator only.");
      router.push("/");
      return;
    }

    setUser(parsedUser);
  }, []);

  function handleLogout() {
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    router.push("/");
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading dashboard...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 flex">

      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-green-900 text-white flex flex-col p-6 z-30
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:relative md:translate-x-0 md:w-72
        `}
      >
        {/* CLOSE BUTTON — mobile only */}
        <button
          className="md:hidden self-end mb-4 text-green-200 hover:text-white"
          onClick={() => setSidebarOpen(false)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* LOGO */}
        <div className="flex flex-col items-center border-b border-green-700 pb-6">
          <Image
            src="/Images/LOGO.jpg"
            alt="Main Street Medical Center"
            width={80}
            height={80}
            className="rounded-full bg-white p-1"
          />
          <h1 className="text-xl font-bold mt-4 text-center">Main Street EMR</h1>
          <p className="text-green-200 text-sm mt-1">Administrator Panel</p>
        </div>

        {/* NAVIGATION */}
        <nav className="mt-8 flex flex-col gap-3 flex-1">
          {navItems.map((item) => (
            <button
              key={item}
              onClick={() => {
                setActiveNav(item);
                setSidebarOpen(false);
              }}
              className={`px-4 py-3 rounded-xl text-left transition ${
                activeNav === item
                  ? "bg-green-800"
                  : "hover:bg-green-800"
              }`}
            >
              {item}
            </button>
          ))}

          <div className="mt-auto pt-6 flex flex-col gap-3">
            <button
              onClick={() => router.push("/")}
              className="bg-white text-green-900 px-4 py-3 rounded-xl font-semibold hover:bg-gray-100"
            >
              Home
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-500 px-4 py-3 rounded-xl font-semibold text-white"
            >
              Logout
            </button>
          </div>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <section className="flex-1 min-w-0 flex flex-col">

        {/* MOBILE TOP BAR */}
        <div className="md:hidden bg-green-900 text-white px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-bold text-lg">Main Street EMR</span>
          <div className="w-8" />
        </div>

        {/* PAGE CONTENT */}
        <div className="flex-1 p-4 md:p-8">

          {/* TOP BAR */}
          <div className="flex justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                Welcome Back, {user.username}
              </h2>
              <p className="text-gray-500 mt-1 text-sm md:text-base">
                Main Street Medical Center Administration
              </p>
            </div>
            <div className="bg-white px-3 md:px-5 py-2 md:py-3 rounded-xl shadow-sm font-medium text-gray-700 text-sm md:text-base shrink-0">
              {user.role}
            </div>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm">
              <h3 className="text-gray-500 text-sm">Total Patients</h3>
              <p className="text-4xl font-bold text-green-800 mt-3">1,248</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm">
              <h3 className="text-gray-500 text-sm">Today's Appointments</h3>
              <p className="text-4xl font-bold text-green-800 mt-3">42</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm">
              <h3 className="text-gray-500 text-sm">Pending Lab Results</h3>
              <p className="text-4xl font-bold text-green-800 mt-3">16</p>
            </div>
          </div>

          {/* ACTIVITY */}
          <div className="bg-white mt-6 md:mt-8 p-6 rounded-2xl shadow-sm">
            <h3 className="text-xl font-semibold text-gray-800 mb-5">
              Recent Activity
            </h3>
            <div className="space-y-4 text-gray-600">
              <div className="border-b pb-3">New patient registered at Reception.</div>
              <div className="border-b pb-3">Laboratory results uploaded.</div>
              <div className="border-b pb-3">Pharmacy inventory updated.</div>
              <div>Staff account created successfully.</div>
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}