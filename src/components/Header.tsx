import Link from "next/link";

const Header = () => {
   return (
      <header className="w-full py-4 px-6 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
         <h1 className="text-xl font-bold text-gray-900 dark:text-white">Hagon.dev</h1>
         <nav className="flex gap-6 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Link href="/">Home</Link>
            <Link href="/about">About</Link>
            <Link href="/skills">Skills</Link>
            <Link href="/projects">Projects</Link>
            <Link href="/contact">Contact</Link>
         </nav>
      </header>
   );
};

export default Header;
