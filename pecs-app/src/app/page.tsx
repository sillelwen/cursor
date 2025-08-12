import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="space-y-6">
      <p className="text-lg text-gray-200">Create printable PECS card sheets with images and labels.</p>
      <Link href="/editor" className="inline-block rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
        Open Editor
      </Link>
    </main>
  );
}