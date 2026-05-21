import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6">

      <div className="text-center max-w-xl w-full">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/Images/LOGO.jpg"
            alt="Main Street Medical Center"
            width={170}
            height={170}
            className="rounded-full shadow-md"
            priority
          />
        </div>

        {/* Heading */}
        <h1 className="text-5xl md:text-6xl font-bold text-green-800 tracking-tight">
          Main Street EMR
        </h1>

        {/* Motto */}
        <p className="text-red-600 italic text-lg mt-4">
          Commitment to Good Health
        </p>

        {/* Small Description */}
        <p className="text-gray-500 mt-6 text-lg leading-8">
          Healthcare management made simple.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 mt-12">

          <button
            className="
              bg-green-800
              hover:bg-green-700
              text-white
              px-10
              py-4
              rounded-2xl
              font-semibold
              text-lg
              transition
              duration-200
              shadow-md
            "
          >
            Get Started
          </button>

          <Link
  href="/login"
  className="
    border-2
    border-green-800
    text-green-800
    hover:bg-green-50
    px-10
    py-4
    rounded-2xl
    font-semibold
    text-lg
    transition
    inline-block
  "
>
  Staff Login
</Link>

        </div>

      </div>

    </main>
  );
}