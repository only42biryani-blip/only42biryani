import Link from 'next/link';
import OrderTracker from '@/components/OrderTracker';

export const metadata = {
  title: 'Your order',
  robots: { index: false, follow: false },
};

export default async function OrderStatusPage({ params }) {
  const { code } = await params;
  return (
    <main className="min-h-screen bg-black text-white px-6 py-16 font-inter">
      <div className="max-w-[560px] mx-auto">
        <Link href="/" className="text-accent font-mono text-xs tracking-widest uppercase hover:text-white">← Back to Only42Biryani</Link>
        <h1 className="font-grotesk text-4xl font-extrabold tracking-tight mt-8 mb-8 text-[#F5F1E8]">Your order</h1>
        <OrderTracker code={String(code).toUpperCase()} />
      </div>
    </main>
  );
}
