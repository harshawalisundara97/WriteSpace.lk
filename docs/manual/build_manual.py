"""Generates docs/USER_MANUAL.pdf. Usage: python3 docs/manual/build_manual.py docs/USER_MANUAL.pdf"""
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

out = sys.argv[1]
B = "https://writespace.lk"
ss = getSampleStyleSheet()
H1, H2, P = ss["Title"], ss["Heading2"], ss["BodyText"]
el = []

def tbl(rows):
    t = Table([[Paragraph(f"<b>{a}</b>", P), Paragraph(b, P)] for a, b in rows], colWidths=[170, 310])
    t.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.4, colors.grey), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                           ("BACKGROUND", (0, 0), (0, -1), colors.whitesmoke)]))
    el.extend([t, Spacer(1, 10)])

def steps(title, items):
    el.append(Paragraph(title, H2))
    for i, s in enumerate(items, 1):
        el.append(Paragraph(f"{i}. {s}", P))
    el.append(Spacer(1, 6))

el.append(Paragraph("WriteSpace.lk — User Manual", H1))
el.append(Paragraph(f"Live base URL: <b>{B}</b> (set by NEXT_PUBLIC_SITE_URL). Local development: <b>http://localhost:3000</b>. "
                    "All paths below are relative to the base URL.", P))
el.append(Spacer(1, 10))

el.append(Paragraph("1. Key URLs", H2))
tbl([
    ("Customer login", f"{B}/login"),
    ("Customer register", f"{B}/register"),
    ("Forgot password", f"{B}/forgot-password"),
    ("Customer account", f"{B}/account"),
    ("Admin login", f"{B}/login?next=/admin  (same login page; staff/admin accounts go to the dashboard)"),
    ("Admin dashboard", f"{B}/admin"),
    ("Guest order tracking", f"{B}/track"),
])

el.append(Paragraph("2. Storefront pages (public)", H2))
tbl([
    ("/", "Home page"), ("/products", "All products, search &amp; filters"),
    ("/products/[slug]", "Product detail: buy, wishlist, back-in-stock alert"),
    ("/c/[category]", "Category listing"), ("/bundles", "School packs / bundles"), ("/promotions", "Current offers"),
    ("/book-list", "Paste a school book list and add matches to cart"), ("/wishlist", "Saved items"),
    ("/checkout", "Checkout (card, PayHere, cash on delivery, gift wrap)"),
    ("/track", "Track an order with order no. + email/phone"),
    ("/unsubscribe", "Stop marketing / cart-reminder emails"),
    ("/about, /contact, /faq", "Information"), ("/shipping, /returns, /privacy, /terms", "Policies"),
])

steps("3. Customer guide", [
    "Create an account at /register, or sign in at /login. Use /forgot-password to reset your password.",
    "Browse /products or a category; open a product, choose a variant and quantity, then Add to cart.",
    "Tap the heart to save to /wishlist. If an item is out of stock, enter your email to be notified when it returns.",
    "For school lists, go to /book-list, paste the list, review the matches and add all to cart.",
    "At /checkout enter contact and delivery details, pick delivery method and district, optionally add gift wrap and a message, choose payment (card / PayHere / cash on delivery) and place the order.",
    "A confirmation page and email follow. Follow the order in /account/orders or, without an account, at /track.",
    "Manage saved addresses at /account/addresses and your details at /account/profile.",
])

el.append(PageBreak())
el.append(Paragraph("4. Admin guide", H2))
el.append(Paragraph("Sign in at <b>/login?next=/admin</b> with a staff or admin account. Roles: <b>admin</b> (full access incl. staff and audit log) "
                    "and <b>staff</b> (permissions set by an admin). Menu items you cannot use are hidden.", P))
el.append(Spacer(1, 6))
tbl([
    ("/admin", "Dashboard overview"),
    ("/admin/orders", "Orders: view, change status (paid, fulfilled, shipped, delivered), courier + tracking, invoice PDF"),
    ("/admin/refunds", "Refunds"),
    ("/admin/products", "Products: create (/admin/products/new), edit, variants, price tiers, specs, images, CSV import/export"),
    ("/admin/inventory", "Stock levels and adjustments (sends back-in-stock emails)"),
    ("/admin/categories", "Categories"), ("/admin/bundles", "Bundles / school packs"),
    ("/admin/promotions", "Promo codes and discounts"), ("/admin/banners", "Home page banners"),
    ("/admin/reviews", "Approve / reject reviews"), ("/admin/customers", "Customers; block / unblock"),
    ("/admin/reports", "Sales, tax and product reports with CSV export"),
    ("/admin/settings", "Store contact, delivery fees, cash on delivery, gift wrap"),
    ("/admin/staff", "Staff accounts &amp; permissions (admin only)"),
    ("/admin/audit", "Audit log of admin changes (admin only)"),
])
steps("Common admin tasks", [
    "Add a product: Products &gt; New, fill details, add variants and stock, publish.",
    "Ship an order: Orders &gt; open order &gt; status Shipped, choose courier, enter tracking number, save. The customer sees it at /track.",
    "Restock: Inventory &gt; adjust quantity; pending back-in-stock alerts are emailed automatically.",
    "Run a promotion: Promotions &gt; new code, type (percent / fixed), dates, save.",
    "Add staff: Staff &gt; invite, choose role and permissions.",
])
el.append(Paragraph("Note: in demo mode (no Supabase configured) admin changes are not saved.", P))

SimpleDocTemplate(out, pagesize=A4, title="WriteSpace.lk User Manual").build(el)
