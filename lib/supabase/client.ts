type BrowserAuthResult = {
  data: { url?: string } | null;
  error: Error | null;
};

type BrowserSessionResult = {
  data: {
    session: null;
  };
  error: Error | null;
};

type SignInWithOAuthArgs = {
  provider: 'linkedin_oidc' | string;
  options?: {
    redirectTo?: string;
    scopes?: string;
  };
};

type SignInWithOtpArgs = {
  email: string;
  options?: {
    emailRedirectTo?: string;
  };
};

type BrowserSupabaseClient = {
  auth: {
    signInWithOAuth(args: SignInWithOAuthArgs): Promise<BrowserAuthResult>;
    signInWithOtp(args: SignInWithOtpArgs): Promise<BrowserAuthResult>;
    getSession(): Promise<BrowserSessionResult>;
  };
};

const CONFIG_ERROR_MESSAGE = 'Supabase auth is not configured for this environment.';
const EMAIL_ERROR_MESSAGE = 'Enter a valid email address.';

function readAuthConfig() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function buildRedirectUrl(redirectTo?: string): string | null {
  if (!redirectTo) {
    return null;
  }

  return redirectTo;
}

async function startOAuthSignIn({ provider, options }: SignInWithOAuthArgs): Promise<BrowserAuthResult> {
  const { supabaseUrl } = readAuthConfig();
  const redirectTo = buildRedirectUrl(options?.redirectTo);

  if (!supabaseUrl || !redirectTo) {
    return {
      data: null,
      error: new Error(CONFIG_ERROR_MESSAGE)
    };
  }

  try {
    const authorizeUrl = new URL('/auth/v1/authorize', supabaseUrl);
    authorizeUrl.searchParams.set('provider', provider);
    authorizeUrl.searchParams.set('redirect_to', redirectTo);

    if (options?.scopes) {
      authorizeUrl.searchParams.set('scopes', options.scopes);
    }

    if (typeof window !== 'undefined') {
      window.location.assign(authorizeUrl.toString());
    }

    return {
      data: { url: authorizeUrl.toString() },
      error: null
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(CONFIG_ERROR_MESSAGE)
    };
  }
}

async function startEmailSignIn({ email, options }: SignInWithOtpArgs): Promise<BrowserAuthResult> {
  const { supabaseUrl, supabaseAnonKey } = readAuthConfig();
  const trimmedEmail = email.trim();
  const emailRedirectTo = buildRedirectUrl(options?.emailRedirectTo);

  if (!isValidEmail(trimmedEmail)) {
    return {
      data: null,
      error: new Error(EMAIL_ERROR_MESSAGE)
    };
  }

  if (!supabaseUrl || !supabaseAnonKey || !emailRedirectTo) {
    return {
      data: null,
      error: new Error(CONFIG_ERROR_MESSAGE)
    };
  }

  try {
    const response = await fetch(new URL('/auth/v1/otp', supabaseUrl), {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        authorization: `Bearer ${supabaseAnonKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        email: trimmedEmail,
        create_user: true,
        gotrue_meta_security: true,
        email_redirect_to: emailRedirectTo
      })
    });

    if (!response.ok) {
      return {
        data: null,
        error: new Error(CONFIG_ERROR_MESSAGE)
      };
    }

    return {
      data: {},
      error: null
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(CONFIG_ERROR_MESSAGE)
    };
  }
}

async function readSession(): Promise<BrowserSessionResult> {
  return {
    data: {
      session: null
    },
    error: null
  };
}

const browserSupabaseClient: BrowserSupabaseClient = {
  auth: {
    signInWithOAuth: startOAuthSignIn,
    signInWithOtp: startEmailSignIn,
    getSession: readSession
  }
};

export function createClient() {
  return browserSupabaseClient;
}
