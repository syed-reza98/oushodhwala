/** Stub — Supabase removed. Keep imports compiling during migration. */
export const supabase = {
  from: () => ({ select: async () => ({ data: [], error: null }), insert: async () => ({ error: null }), update: async () => ({ error: null }), eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
  rpc: async () => ({ data: null, error: null }),
  auth: {
    getUser: async () => ({ data: { user: null } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signOut: async () => {},
  },
  storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: "" } }) }) },
} as any;
