import Image from "next/image";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#eaf5ee] flex items-center justify-center px-4">

      {/* Login Card */}
      <div className="w-full max-w-md bg-white rounded-[30px] shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-green-800 px-8 py-10 text-center">

          <div className="flex justify-center">
            <Image
              src="/Images/LOGO.jpg"
              alt="Main Street Medical Center"
              width={95}
              height={95}
              className="rounded-full bg-white p-2 shadow-md"
              priority
            />
          </div>

          <h1 className="text-white text-3xl font-bold mt-5">
            Main Street Medical Center
          </h1>

          <p className="text-green-100 mt-2 text-sm">
            Electronic Health Records System
          </p>

        </div>

        {/* Form */}
        <div className="p-8">

          <form className="space-y-5">

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>

              <input
                type="text"
                placeholder="Enter username"
                className="
                  w-full
                  border
                  border-gray-300
                  rounded-xl
                  px-4
                  py-3
                  outline-none
                  focus:ring-2
                  focus:ring-green-700
                "
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>

              <input
                type="password"
                placeholder="Enter password"
                className="
                  w-full
                  border
                  border-gray-300
                  rounded-xl
                  px-4
                  py-3
                  outline-none
                  focus:ring-2
                  focus:ring-green-700
                "
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Login As
              </label>

              <select
                className="
                  w-full
                  border
                  border-gray-300
                  rounded-xl
                  px-4
                  py-3
                  outline-none
                  focus:ring-2
                  focus:ring-green-700
                  bg-white
                "
              >
                <option>Receptionist</option>
                <option>Administrator</option>
                <option>Level 1 Nurse / Midwife</option>
                <option>Lab Technician</option>
                <option>Sonographer / Radiologist</option>
              </select>
            </div>

            {/* Remember */}
            <div className="flex items-center justify-between text-sm">

              <label className="flex items-center gap-2 text-gray-600">
                <input type="checkbox" />
                Remember Me
              </label>

              <button
                type="button"
                className="text-green-700 hover:underline"
              >
                Forgot Password?
              </button>

            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="
                w-full
                bg-green-800
                hover:bg-green-700
                text-white
                py-3
                rounded-xl
                font-semibold
                text-lg
                transition
              "
            >
              Login
            </button>

          </form>

        </div>

      </div>

    </main>
  );
}