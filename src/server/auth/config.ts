/** Temporary stubs while Auth.js init is debugged. */
export const handlers = { GET: async () => new Response("auth disabled"), POST: async () => new Response("auth disabled") };
export const auth = async () => null;
export const signIn = async () => { throw new Error("auth disabled"); };
export const signOut = async () => {};
