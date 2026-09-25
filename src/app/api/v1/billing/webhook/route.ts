import { ServiceError } from '@/lib/billing';
import { applyStripeEvent, verifyStripeEvent } from '@/lib/stripe-billing';
import { boundedBody, json, serviceError } from '@/lib/service-http';
export const runtime='nodejs';
export async function POST(req: Request) {
  try {
    const secret=process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new ServiceError(503,'webhook_unavailable','Webhook is not configured.');
    const event=verifyStripeEvent(await boundedBody(req,256_000),req.headers.get('stripe-signature'),secret);
    return json({received:true,result:await applyStripeEvent(event)});
  } catch (error) { return serviceError(error); }
}
