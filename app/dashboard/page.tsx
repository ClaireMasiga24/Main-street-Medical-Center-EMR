import Image from "next/image";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gray-100 flex">

      {/* Sidebar */}
      <aside className="w-72 bg-green-900 text-white flex flex-col p-6">

        {/* Logo */}
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

        {/* Navigation */}
        <nav className="mt-8 flex flex-col gap-3">

          <button className="bg-green-800 hover:bg-green-700 px-4 py-3 rounded-xl text-left transition">
            Dashboard
          </button>

          <button className="hover:bg-green-800 px-4 py-3 rounded-xl text-left transition">
            Patient Records
          </button>

          <button className="hover:bg-green-800 px-4 py-3 rounded-xl text-left transition">
            Appointments
          </button>

          <button className="hover:bg-green-800 px-4 py-3 rounded-xl text-left transition">
            Laboratory
          </button>

          <button className="hover:bg-green-800 px-4 py-3 rounded-xl text-left transition">
            Pharmacy
          </button>

          <button className="hover:bg-green-800 px-4 py-3 rounded-xl text-left transition">
            Billing
          </button>

          <button className="hover:bg-green-800 px-4 py-3 rounded-xl text-left transition">
            Staff Management
          </button>

          <button className="hover:bg-green-800 px-4 py-3 rounded-xl text-left transition">
            Settings
          </button>

        </nav>

      </aside>

      {/* Main Content */}
      <section className="flex-1 p-8">

        {/* Top Bar */}
        <div className="flex justify-between items-center mb-8">

          <div>
            <h2 className="text-3xl font-bold text-gray-800">
              Welcome Back
            </h2>

            <p className="text-gray-500 mt-1">
              Main Street Medical Center Administration
            </p>
          </div>

          <div className="bg-white px-5 py-3 rounded-xl shadow-sm">
            Administrator
          </div>

        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h3 className="text-gray-500 text-sm">
              Total Patients
            </h3>

            <p className="text-4xl font-bold text-green-800 mt-3">
              1,248
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h3 className="text-gray-500 text-sm">
              Today's Appointments
            </h3>

            <p className="text-4xl font-bold text-green-800 mt-3">
              42
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h3 className="text-gray-500 text-sm">
              Pending Lab Results
            </h3>

            <p className="text-4xl font-bold text-green-800 mt-3">
              16
            </p>
          </div>

        </div>

        {/* Activity Section */}
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