import { getStatus } from '@/lib/status';

export async function GET() {
  const status = await getStatus();
  return Response.json(status, {
    headers: { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=30' },
  });
}
