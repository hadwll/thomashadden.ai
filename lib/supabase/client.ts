type AuthHelperResult = {
  data: null;
  error: Error | null;
};

async function notImplemented(method: string): Promise<AuthHelperResult> {
  throw new Error(`${method} is not implemented in this ticket slice.`);
}

export const supabaseClientStub = {
  auth: {
    signInWithOAuth: async () => notImplemented('signInWithOAuth'),
    signInWithOtp: async () => notImplemented('signInWithOtp')
  }
};

export function createClient() {
  return supabaseClientStub;
}
