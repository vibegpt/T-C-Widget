import { handleAssessment } from '@/lib/agent-service';
import { preflight } from '@/lib/service-http';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(req: Request) { return handleAssessment(req); }
export const OPTIONS=preflight;
