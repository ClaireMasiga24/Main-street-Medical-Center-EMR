"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser =
      localStorage.getItem("user") ||
      sessionStorage.getItem("user");

    if (!storedUser) {
      router.push("/");
      return;
    }

    const parsedUser = JSON.parse(storedUser);

    // 🔐 ADMIN ONLY ACCESS
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

      {/* SIDEBAR */}
      <aside className="w-72 bg-green-900 text-white flex flex-col p-6">

        {/* LOGO */}
        <div className="flex flex-col items-center border-b border-green-700 pb-6">

          <Image
            src="/Images/LOGO.jpg"
            alt="Main Street Medical Center"
            width={80}
            height={80}
            className="rounded-full bg-white p-1"
          />

          <h1 className="text-xl font-bold mt-4 text-center">
            Main Street EMR
          </h1>

          <p className="text-green-200 text-sm mt-1">
            Administrator Panel
          </p>

        </div>

        {/* NAVIGATION */}
        <nav className="mt-8 flex flex-col gap-3">

          <button className="bg-green-800 px-4 py-3 rounded-xl text-left">
            Dashboard
          </button>

          <button className="hover:bg-green-800 px-4 py-3 rounded-xl text-left">
            Patient Records
          </button>

          <button className="hover:bg-green-800 px-4 py-3 rounded-xl text-left">
            Appointments
          </button>

          <button className="hover:bg-green-800 px-4 py-3 rounded-xl text-left">
            Laboratory
          </button>

          <button className="hover:bg-green-800 px-4 py-3 rounded-xl text-left">
            Pharmacy
          </button>

          <button className="hover:bg-green-800 px-4 py-3 rounded-xl text-left">
            Billing
          </button>

          <button className="hover:bg-green-800 px-4 py-3 rounded-xl text-left">
            Staff Management
          </button>

          <button className="hover:bg-green-800 px-4 py-3 rounded-xl text-left">
            Settings
          </button>

          {/* HOME */}
          <button
            onClick={() => router.push("/")}
            className="mt-6 bg-white text-green-900 px-4 py-3 rounded-xl font-semibold hover:bg-gray-100"
          >
            Home
          </button>

          {/* LOGOUT */}
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-500 px-4 py-3 rounded-xl font-semibold text-white"
          >
            Logout
          </button>

        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <section className="flex-1 p-8">

        {/* TOP BAR */}
        <div className="flex justify-between items-center mb-8">

          <div>
            <h2 className="text-3xl font-bold text-gray-800">
              Welcome Back, {user.username}
            </h2>

            <p className="text-gray-500 mt-1">
              Main Street Medical Center Administration
            </p>
          </div>

          <div className="bg-white px-5 py-3 rounded-xl shadow-sm font-medium text-gray-700">
            {user.role}
          </div>

        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

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
        <div className="bg-white mt-8 p-6 rounded-2xl shadow-sm">

          <h3 className="text-xl font-semibold text-gray-800 mb-5">
            Recent Activity
          </h3>

          <div className="space-y-4 text-gray-600">

            <div className="border-b pb-3">
              New patient registered at Reception.
            </div>

            <div className="border-b pb-3">
              Laboratory results uploaded.
            </div>

            <div className="border-b pb-3">
              Pharmacy inventory updated.
            </div>

            <div>
              Staff account created successfully.
            </div>

          </div>

        </div>

      </section>

    </main>
  );
}