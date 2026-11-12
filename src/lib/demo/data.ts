import type {
  Banner, Category, Collection, ProductWithVariants, Promotion,
} from "@/lib/types";

// In-repo demo dataset mirroring supabase/seed.sql, used when Supabase isn't
// configured so the storefront is viewable with zero setup.

const now = new Date().toISOString();

export const demoCategories: Category[] = [
  { id: "c1", parent_id: null, name: "Writing & Pens", slug: "writing-pens", description: null, age_group: "all", position: 1, is_featured: true },
  { id: "c2", parent_id: null, name: "Notebooks & Paper", slug: "notebooks-paper", description: null, age_group: "all", position: 2, is_featured: true },
  { id: "c3", parent_id: null, name: "Art & Craft", slug: "art-craft", description: null, age_group: "all", position: 3, is_featured: true },
  { id: "c4", parent_id: null, name: "Kids Corner", slug: "kids-corner", description: "Bright, safe supplies for little hands.", age_group: "kids", position: 4, is_featured: true },
  { id: "c5", parent_id: null, name: "Office & Desk", slug: "office-desk", description: null, age_group: "adults", position: 5, is_featured: true },
];

export const demoCollections: Collection[] = [
  { id: "k1", name: "Back to School", slug: "back-to-school", description: null, is_featured: true, position: 1 },
  { id: "k2", name: "New Arrivals", slug: "new-arrivals", description: null, is_featured: true, position: 2 },
  { id: "k3", name: "Deals of the Day", slug: "deals-of-the-day", description: null, is_featured: true, position: 3 },
];

function product(
  id: string, cat: string, name: string, slug: string, brand: string,
  age: "kids" | "adults" | "all", desc: string,
  variants: { sku: string; name?: string; price: number; compareAt?: number; stock: number }[],
): ProductWithVariants {
  return {
    id, category_id: cat, name, slug, description: desc, brand, age_group: age,
    status: "published", images: [], seo_title: null, seo_description: null, created_at: now,
    product_variants: variants.map((v, i) => ({
      id: `${id}-v${i}`, product_id: id, sku: v.sku, name: v.name ?? null, options: {},
      price_minor: v.price, compare_at_minor: v.compareAt ?? null, currency: "LKR",
      position: i, is_active: true,
      inventory: { variant_id: `${id}-v${i}`, on_hand: v.stock, reserved: 0, low_stock_threshold: 5 },
    })),
  };
}

export const demoProducts: ProductWithVariants[] = [
  product("p1", "c4", "Rainbow Gel Pens (12-pack)", "rainbow-gel-pens-12", "DooWrite", "kids",
    "Smooth-writing glitter gel pens in 12 vivid colours. Perfect for kids' journals and doodles.",
    [{ sku: "WS-GEL-12", name: "12-pack", price: 85000, compareAt: 120000, stock: 120 }]),
  product("p2", "c1", "Classic Fountain Pen", "classic-fountain-pen", "Inkwell", "adults",
    "Brushed-steel fountain pen with a fine nib. Gift-boxed with two ink cartridges.",
    [{ sku: "WS-FP-BLK", name: "Black / Fine", price: 345000, stock: 40 }]),
  product("p3", "c2", "A5 Dotted Notebook", "a5-dotted-notebook", "PaperCo", "all",
    "160gsm bleed-proof dotted pages, lay-flat binding, elastic closure. Ideal for bullet journaling.",
    [{ sku: "WS-NB-A5-TEAL", name: "A5 / Teal", price: 150000, stock: 75 }, { sku: "WS-NB-A5-BLK", name: "A5 / Black", price: 150000, stock: 3 }]),
  product("p4", "c3", "Watercolour Paint Set (24)", "watercolour-set-24", "ArtLab", "all",
    "24 half-pans of vibrant, blendable watercolour with a travel brush. Non-toxic.",
    [{ sku: "WS-WC-24", name: "24 half-pans", price: 275000, compareAt: 320000, stock: 60 }]),
  product("p5", "c4", "Jumbo Crayons (24)", "jumbo-crayons-24", "DooWrite", "kids",
    "Chunky, easy-grip crayons for little hands. Washable and non-toxic.",
    [{ sku: "WS-CRAY-24", name: "24-pack", price: 62000, stock: 200 }]),
  product("p6", "c5", "Bamboo Desk Organizer", "bamboo-desk-organizer", "DeskLife", "adults",
    "Minimalist bamboo caddy with slots for pens, phone, notes and clips. Sustainably sourced.",
    [{ sku: "WS-ORG-BMB", name: "Natural bamboo", price: 420000, compareAt: 520000, stock: 35 }]),
];

const COLLECTION_MEMBERS: Record<string, string[]> = {
  "back-to-school": ["p1", "p5"],
  "new-arrivals": ["p3", "p2"],
  "deals-of-the-day": ["p1", "p4", "p6"],
};

export function demoCollectionProducts(slug: string): ProductWithVariants[] {
  const ids = COLLECTION_MEMBERS[slug] ?? [];
  return demoProducts.filter((p) => ids.includes(p.id));
}

export const demoBanners: Banner[] = [
  { id: "b1", title: "Back to School — up to 30% off", image_url: null, link_url: "/c/kids-corner", placement: "home_hero", position: 1 },
  { id: "b2", title: "New journals just landed", image_url: null, link_url: "/products/a5-dotted-notebook", placement: "home_hero", position: 2 },
  { id: "b3", title: "Free delivery over LKR 5,000", image_url: null, link_url: "/promotions", placement: "promo_strip", position: 1 },
];

const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 0);

export const demoPromotions: Promotion[] = [
  { id: "promo1", name: "Welcome 10%", type: "percentage", value: 10, code: "WELCOME10", meta: {}, min_subtotal_minor: 0, usage_limit: null, per_customer_limit: null, stackable: false, priority: 10, is_active: true, starts_at: null, ends_at: null },
  { id: "promo2", name: "Deal of the Day -15%", type: "percentage", value: 15, code: null, meta: {}, min_subtotal_minor: 0, usage_limit: null, per_customer_limit: null, stackable: false, priority: 20, is_active: true, starts_at: null, ends_at: endOfDay.toISOString() },
  { id: "promo3", name: "Free shipping over LKR 5,000", type: "free_shipping", value: 0, code: null, meta: {}, min_subtotal_minor: 500000, usage_limit: null, per_customer_limit: null, stackable: true, priority: 5, is_active: true, starts_at: null, ends_at: null },
];

export const demoSettings = {
  flat_shipping_minor: 35000,
  free_shipping_threshold_minor: 500000,
  tax_rate_bps: 0,
  currency: "LKR",
  store_name: "WriteSpace.lk",
  support_email: "hello@writespace.lk",
  support_phone: "+94 11 234 5678",
  whatsapp: "+94 77 123 4567",
  address: "128 Galle Road, Colombo 03, Sri Lanka",
  instagram_url: "https://instagram.com/writespace.lk",
  facebook_url: "https://facebook.com/writespace.lk",
};

// ---- admin demo helpers ----

export function demoDashboard(rangeDays = 7) {
  const now = Date.now();
  const start = now - rangeDays * 86400_000;
  const cur = demoOrders.filter((o) => PAID.includes(o.status) && new Date(o.created_at).getTime() >= start);
  const revenue = cur.reduce((s, o) => s + o.total_minor, 0);
  const aov = cur.length ? Math.round(revenue / cur.length) : 0;
  const mkDelta = (v: number) => ({ value: v > 0 ? "+100%" : "0%", positive: true });

  const byDay = new Map<string, number>();
  for (let i = rangeDays - 1; i >= 0; i--) byDay.set(new Date(now - i * 86400_000).toISOString().slice(0, 10), 0);
  for (const o of cur) { const k = o.created_at.slice(0, 10); if (byDay.has(k)) byDay.set(k, (byDay.get(k) ?? 0) + o.total_minor); }
  const revenueSeries = Array.from(byDay.entries()).map(([date, minor]) => ({ date: date.slice(5), revenue: Math.round(minor / 100) }));

  const catMap = new Map<string, number>();
  for (const o of cur) for (const it of o.items) catMap.set(catNameOf(it.variant_id), (catMap.get(catNameOf(it.variant_id)) ?? 0) + it.line_total_minor);
  const categoryBreakdown = Array.from(catMap.entries()).map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue);

  const recentOrders = [...demoOrders].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 6)
    .map((o) => ({ id: o.id, order_number: o.order_number, status: o.status, total_minor: o.total_minor, currency: o.currency, created_at: o.created_at }));

  const low = demoProducts.flatMap((p) =>
    p.product_variants.filter((v) => (v.inventory?.on_hand ?? 0) - (v.inventory?.reserved ?? 0) <= (v.inventory?.low_stock_threshold ?? 5))
      .map((v) => ({ variant_id: v.id, on_hand: v.inventory!.on_hand, reserved: v.inventory!.reserved, low_stock_threshold: v.inventory!.low_stock_threshold, variant: { sku: v.sku, name: v.name, product: { name: p.name } } })),
  ).slice(0, 8);

  const topProducts = [{ name: "A5 Dotted Notebook", qty: 1 }, { name: "Bamboo Desk Organizer", qty: 1 }, { name: "Rainbow Gel Pens (12-pack)", qty: 1 }];

  return {
    currency: "LKR", range: rangeDays,
    kpis: {
      revenue: { value: revenue, delta: mkDelta(revenue) },
      orders: { value: cur.length, delta: mkDelta(cur.length) },
      aov: { value: aov, delta: mkDelta(aov) },
      repeatRate: { value: 0, delta: { value: "0%", positive: true } },
    },
    revenueSeries, categoryBreakdown, recentOrders, low, topProducts,
  };
}

// ---- demo reviews ----
import type { ReviewView } from "@/lib/reviews/types";

const d = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400_000).toISOString();

const DEMO_REVIEWS: Record<string, ReviewView[]> = {
  p1: [
    { id: "r1", rating: 5, title: "Kids love them", body: "Bright colours and they write so smoothly. My daughter uses them every day.", author: "Nimali P.", created_at: d(4), verified: true },
    { id: "r2", rating: 4, title: "Great value", body: "Good set for the price. One pen was a little faint but the rest are perfect.", author: "Rajiv S.", created_at: d(12), verified: true },
    { id: "r3", rating: 5, title: "Vivid and fun", body: "The glitter ones are a hit for journaling.", author: "Ayesha K.", created_at: d(20), verified: false },
  ],
  p2: [
    { id: "r4", rating: 5, title: "Feels premium", body: "Lovely weight and a smooth nib. The gift box is a nice touch.", author: "Dilshan R.", created_at: d(6), verified: true },
    { id: "r5", rating: 4, title: "Elegant", body: "Writes beautifully. Wish it came with more ink colours.", author: "Fathima N.", created_at: d(18), verified: true },
  ],
  p3: [
    { id: "r6", rating: 5, title: "Perfect for bullet journaling", body: "The dotted pages are exactly 5mm and the paper handles fountain pen ink with no bleed.", author: "Tharindu W.", created_at: d(3), verified: true },
    { id: "r7", rating: 5, title: "Lays flat", body: "Binding is excellent, stays open on the desk.", author: "Sanduni J.", created_at: d(9), verified: true },
    { id: "r8", rating: 4, title: "Good quality", body: "Cover could be a bit sturdier but the paper is lovely.", author: "Kasun M.", created_at: d(15), verified: false },
  ],
  p4: [
    { id: "r9", rating: 5, title: "Rich pigments", body: "Blends beautifully and the travel brush is handy.", author: "Ishara D.", created_at: d(7), verified: true },
  ],
  p6: [
    { id: "r10", rating: 4, title: "Tidy desk at last", body: "Sturdy bamboo and fits all my pens and sticky notes.", author: "Menaka T.", created_at: d(10), verified: true },
  ],
};

export function demoProductReviews(productId: string): ReviewView[] {
  return DEMO_REVIEWS[productId] ?? [];
}

// ---- demo orders (so the admin ops views are viewable without a backend) ----

export interface DemoOrderItem { id: string; product_name: string; sku: string; unit_price_minor: number; quantity: number; line_total_minor: number; variant_id: string }
export interface DemoActivity { id: string; action: string; after: unknown; created_at: string }
export interface DemoOrder {
  id: string; order_number: string; email: string; status: string; currency: string;
  subtotal_minor: number; discount_minor: number; shipping_minor: number; tax_minor: number; total_minor: number;
  shipping_address: Record<string, string>; tracking_number: string | null; notes: string | null;
  created_at: string; placed_at: string | null;
  items: DemoOrderItem[];
  payment: { id: string; provider: string; provider_payment_id: string | null; status: string; amount_minor: number; currency: string } | null;
  activity: DemoActivity[];
}

const addr = (full_name: string, line1: string, city: string, phone: string): Record<string, string> => ({ full_name, line1, city, postal_code: "00300", phone, country: "LK" });

export const demoOrders: DemoOrder[] = [
  {
    id: "o1", order_number: "WS-20261106-1042", email: "nimali@example.com", status: "paid", currency: "LKR",
    subtotal_minor: 235000, discount_minor: 23500, shipping_minor: 35000, tax_minor: 0, total_minor: 246500,
    shipping_address: addr("Nimali Perera", "42 Galle Road", "Colombo 03", "+94 77 123 4567"),
    tracking_number: null, notes: null, created_at: d(1), placed_at: d(1),
    items: [
      { id: "oi1", product_name: "Rainbow Gel Pens (12-pack)", sku: "WS-GEL-12", unit_price_minor: 85000, quantity: 1, line_total_minor: 85000, variant_id: "p1-v0" },
      { id: "oi2", product_name: "A5 Dotted Notebook", sku: "WS-NB-A5-TEAL", unit_price_minor: 150000, quantity: 1, line_total_minor: 150000, variant_id: "p3-v0" },
    ],
    payment: { id: "pay1", provider: "stripe", provider_payment_id: "pi_demo_1", status: "succeeded", amount_minor: 246500, currency: "LKR" },
    activity: [
      { id: "ac1", action: "order.placed", after: { status: "pending_payment" }, created_at: d(1) },
      { id: "ac2", action: "order.paid", after: { status: "paid" }, created_at: d(1) },
    ],
  },
  {
    id: "o2", order_number: "WS-20261104-2210", email: "dilshan@example.com", status: "shipped", currency: "LKR",
    subtotal_minor: 420000, discount_minor: 0, shipping_minor: 0, tax_minor: 0, total_minor: 420000,
    shipping_address: addr("Dilshan Rodrigo", "18 Temple Lane", "Kandy", "+94 71 987 6543"),
    tracking_number: "LK4820193", notes: "Gift wrap requested.", created_at: d(3), placed_at: d(3),
    items: [{ id: "oi3", product_name: "Bamboo Desk Organizer", sku: "WS-ORG-BMB", unit_price_minor: 420000, quantity: 1, line_total_minor: 420000, variant_id: "p6-v0" }],
    payment: { id: "pay2", provider: "stripe", provider_payment_id: "pi_demo_2", status: "succeeded", amount_minor: 420000, currency: "LKR" },
    activity: [
      { id: "ac3", action: "order.placed", after: { status: "pending_payment" }, created_at: d(3) },
      { id: "ac4", action: "order.paid", after: { status: "paid" }, created_at: d(3) },
      { id: "ac5", action: "order.transition", after: { status: "fulfilled" }, created_at: d(2) },
      { id: "ac6", action: "order.transition", after: { status: "shipped" }, created_at: d(2) },
    ],
  },
  {
    id: "o3", order_number: "WS-20261106-5587", email: "ayesha@example.com", status: "pending_payment", currency: "LKR",
    subtotal_minor: 275000, discount_minor: 0, shipping_minor: 35000, tax_minor: 0, total_minor: 310000,
    shipping_address: addr("Ayesha Khan", "7 Lake Drive", "Negombo", "+94 76 222 3344"),
    tracking_number: null, notes: null, created_at: d(0), placed_at: null,
    items: [{ id: "oi4", product_name: "Watercolour Paint Set (24)", sku: "WS-WC-24", unit_price_minor: 275000, quantity: 1, line_total_minor: 275000, variant_id: "p4-v0" }],
    payment: null,
    activity: [{ id: "ac7", action: "order.placed", after: { status: "pending_payment" }, created_at: d(0) }],
  },
];

const PAID = ["paid", "fulfilled", "shipped", "delivered"];
const catNameOf = (variantId: string) => {
  const pid = variantId.split("-")[0];
  const prod = demoProducts.find((p) => p.id === pid);
  return demoCategories.find((c) => c.id === prod?.category_id)?.name ?? "Uncategorized";
};

export function demoAdminOrderRows() {
  return demoOrders.map((o) => ({ id: o.id, order_number: o.order_number, email: o.email, status: o.status, total_minor: o.total_minor, currency: o.currency, created_at: o.created_at }));
}

export function demoAdminOrder(id: string) {
  const o = demoOrders.find((x) => x.id === id);
  if (!o) return null;
  return { order: o, items: o.items, payment: o.payment, refunds: demoRefunds.filter((r) => r.order_id === id), activity: o.activity };
}

export interface DemoRefund {
  id: string; order_id: string; order_number: string; email: string;
  amount_minor: number; currency: string; reason: string | null;
  status: string; restocked: boolean; created_at: string;
}

export const demoRefunds: DemoRefund[] = [
  { id: "rf1", order_id: "o2", order_number: "WS-20261104-2210", email: "dilshan@example.com", amount_minor: 42000, currency: "LKR", reason: "Minor scratch on lid — partial goodwill refund", status: "succeeded", restocked: false, created_at: d(1) },
  { id: "rf2", order_id: "o1", order_number: "WS-20261106-1042", email: "nimali@example.com", amount_minor: 85000, currency: "LKR", reason: "One pen dried out — refunded item", status: "succeeded", restocked: true, created_at: d(0) },
];

export function demoAdminRefunds(): DemoRefund[] {
  return [...demoRefunds].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

// ---- demo customers (so the admin customers views are viewable without a backend) ----
export interface DemoCustomer {
  id: string; email: string; full_name: string | null; phone: string | null;
  is_blocked: boolean; created_at: string;
}

export const demoCustomers: DemoCustomer[] = [
  { id: "cust1", email: "nimali@example.com", full_name: "Nimali Perera", phone: "+94 77 123 4567", is_blocked: false, created_at: d(30) },
  { id: "cust2", email: "dilshan@example.com", full_name: "Dilshan Rodrigo", phone: "+94 71 987 6543", is_blocked: false, created_at: d(48) },
  { id: "cust3", email: "ayesha@example.com", full_name: "Ayesha Khan", phone: "+94 76 222 3344", is_blocked: false, created_at: d(7) },
  { id: "cust4", email: "demo@writespace.lk", full_name: "Demo Shopper", phone: "+94 77 000 0000", is_blocked: false, created_at: d(60) },
];

function demoCustomerStats(email: string) {
  const mine = demoOrders.filter((o) => o.email === email);
  const spent = mine.filter((o) => PAID.includes(o.status)).reduce((s, o) => s + o.total_minor, 0);
  return { count: mine.length, spent };
}

export function demoAdminCustomers() {
  return demoCustomers.map((c) => {
    const { count, spent } = demoCustomerStats(c.email);
    return { ...c, orders: count, spent };
  });
}

export function demoAdminCustomer(id: string) {
  const customer = demoCustomers.find((c) => c.id === id);
  if (!customer) return null;
  const orders = demoOrders
    .filter((o) => o.email === customer.email)
    .map((o) => ({ id: o.id, order_number: o.order_number, status: o.status, total_minor: o.total_minor, currency: o.currency, created_at: o.created_at }));
  return { customer, orders };
}

// ---- demo signed-in user (so account pages are viewable without a backend) ----
export const demoUser = {
  id: "demo-user",
  email: "demo@writespace.lk",
  full_name: "Demo Shopper",
  phone: "+94 77 000 0000",
};
