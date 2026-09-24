// Both REST entrypoints use the same signed response contract.
export { POST, OPTIONS } from '../../check/route';
export const runtime='nodejs';
export const maxDuration=60;
