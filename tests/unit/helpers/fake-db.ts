// Minimal chainable fake of the Supabase query builder for admin action tests.
// Every `from()` chain is recorded; a responder decides what it resolves to.

export interface FakeCall {
  table: string;
  op: "select" | "insert" | "update" | "upsert" | "delete";
  payload?: unknown;
  filters: Array<[string, unknown]>;
}

export type Responder = (call: FakeCall) => { data?: unknown; error?: { message: string } | null };

export function createFakeDb(responder: Responder = () => ({ data: null, error: null })) {
  const calls: FakeCall[] = [];

  function from(table: string) {
    const call: FakeCall = { table, op: "select", filters: [] };
    let opSet = false;
    const setOp = (op: FakeCall["op"], payload?: unknown) => {
      if (!opSet) { call.op = op; call.payload = payload; opSet = true; calls.push(call); }
    };
    const resolve = () => {
      if (!opSet) setOp("select");
      const r = responder(call);
      return Promise.resolve({ data: r.data ?? null, error: r.error ?? null });
    };
    const builder: Record<string, unknown> = {
      select: () => builder,
      insert: (p: unknown) => { setOp("insert", p); return builder; },
      update: (p: unknown) => { setOp("update", p); return builder; },
      upsert: (p: unknown) => { setOp("upsert", p); return builder; },
      delete: () => { setOp("delete"); return builder; },
      eq: (col: string, val: unknown) => { call.filters.push([col, val]); return builder; },
      order: () => builder,
      maybeSingle: resolve,
      single: resolve,
      then: (ok: (v: unknown) => unknown, err?: (e: unknown) => unknown) => resolve().then(ok, err),
    };
    return builder;
  }

  return { db: { from }, calls };
}
