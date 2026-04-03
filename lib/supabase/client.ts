type AuthHelperResult = {
  data: null;
  error: Error | null;
};

type SessionHelperResult = {
  data: {
    session: {
      access_token: string;
      user?: {
        id?: string;
      };
    } | null;
  };
  error: Error | null;
};

async function notImplemented(method: string): Promise<AuthHelperResult> {
  throw new Error(`${method} is not implemented in this ticket slice.`);
}

export const supabaseClientStub = {
  auth: {
    getSession: async (): Promise<SessionHelperResult> => ({
      data: {
        session: null
      },
      error: null
    }),
    signInWithOAuth: async () => notImplemented('signInWithOAuth'),
    signInWithOtp: async () => notImplemented('signInWithOtp')
  }
};

export function createClient() {
  return supabaseClientStub;
}
