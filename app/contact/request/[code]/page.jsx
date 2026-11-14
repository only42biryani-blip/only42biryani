import ContactRequestStatus from '@/components/ContactRequestStatus';

export const metadata = {
  title: 'Your contact request',
  robots: { index: false, follow: false },
};

export default async function ContactRequestPage({ params }) {
  const { code } = await params;
  return (
    <main className="min-h-screen bg-black text-white px-6 py-20 font-inter">
      <div className="max-w-[560px] mx-auto">
        <ContactRequestStatus code={String(code || '').toUpperCase()} />
      </div>
    </main>
  );
}
