import { handleContactSubmit } from './contact-submit';

export async function POST(request: Request) {
  return handleContactSubmit(request);
}
