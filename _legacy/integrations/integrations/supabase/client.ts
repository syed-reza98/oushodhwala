type Chain = {
  select: (..._a: unknown[]) => Chain;
  insert: (..._a: unknown[]) => Promise<{ data: null; error: null }>;
  update: (..._a: unknown[]) => Chain;
  upsert: (..._a: unknown[]) => Promise<{ data: null; error: null }>;
  delete: (..._a: unknown[]) => Chain;
  eq: (..._a: unknown[]) => Chain;
  neq: (..._a: unknown[]) => Chain;
  order: (..._a: unknown[]) => Chain;
  limit: (..._a: unknown[]) => Promise<{ data: []; error: null }> | Chain;
  maybeSingle: () => Promise<{ data: null; error: null }>;
  single: () => Promise<{ data: null; error: null }>;
  then?: Promise<{ data: []; error: null }>["then"];
};

function chain(): Chain {
  const api: Chain = {
    select: () => api,
    insert: async () => ({ data: null, error: null }),
    update: () => api,
    upsert: async () => ({ data: null, error: null }),
    delete: () => api,
    eq: () => api,
    neq: () => api,
    order: () => api,
    limit: () => Promise.resolve({ data: [], error: null }),
    maybeSingle: async () => ({ data: null, error: null }),
    single: async () => ({ data: null, error: null }),
  };
  // thenable so `await supabase.from().select()...` works
  (api as Chain & PromiseLike<{ data: []; error: null }>).then = (onFulfilled, onRejected) =>
    Promise.resolve({ data: [] as [], error: null }).then(onFulfilled, onRejected);
  return api;
}

export const supabase = {
  from: (_table: string) => chain(),
  rpc: async () => ({ data: null, error: null }),
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signOut: async () => ({ error: null }),
  },
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
    }),
  },
} as const;
