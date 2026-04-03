type ServerUser = {
  id: string;
  email?: string | null;
};

type ServerSession = {
  access_token: string;
  user: ServerUser;
};

type ServerAuthResult = {
  data: {
    session: ServerSession | null;
  };
  error: Error | null;
};

type ServerUserResult = {
  data: {
    user: ServerUser | null;
  };
  error: Error | null;
};

type ServerSupabaseClient = {
  auth: {
    getSession(): Promise<ServerAuthResult>;
    getUser(): Promise<ServerUserResult>;
  };
};

function readHeader(headers: Headers, name: string): string | null {
  return headers.get(name) ?? headers.get(name.toLowerCase()) ?? headers.get(name.toUpperCase());
}

function readBearerToken(authorization: string | null): string | null {
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(/\s+/);
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
    return null;
  }

  return token.trim() || null;
}

function readSessionFromRequest(request?: Request): ServerSession | null {
  const headers = request?.headers;
  if (!headers) {
    return null;
  }

  const bearerToken = readBearerToken(readHeader(headers, 'authorization'));
  if (!bearerToken) {
    return null;
  }

  const userId = readHeader(headers, 'x-supabase-user-id') ?? bearerToken;
  if (!userId) {
    return null;
  }

  const email = readHeader(headers, 'x-supabase-user-email');

  return {
    access_token: bearerToken,
    user: {
      id: userId,
      ...(email ? { email } : {})
    }
  };
}

async function resolveSession(request?: Request): Promise<ServerSession | null> {
  return readSessionFromRequest(request);
}

export function createClient(request?: Request): ServerSupabaseClient {
  return {
    auth: {
      async getSession() {
        return {
          data: {
            session: await resolveSession(request)
          },
          error: null
        };
      },
      async getUser() {
        const session = await resolveSession(request);

        return {
          data: {
            user: session?.user ?? null
          },
          error: null
        };
      }
    }
  };
}
