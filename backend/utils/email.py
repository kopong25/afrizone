from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
import os

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
FROM_EMAIL = os.getenv("FROM_EMAIL", "hello@afrizone.com")
FROM_NAME = os.getenv("FROM_NAME", "Afrizone")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

def _wrap(body: str) -> str:
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body{{font-family:Arial,sans-serif;margin:0;padding:0;background:#f4f4f4}}
  .container{{max-width:600px;margin:32px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}}
  .header{{background:#1A5C38;padding:28px 32px;text-align:center}}
  .logo{{color:#D4A017;font-size:28px;font-weight:900;letter-spacing:2px;margin:0}}
  .tagline{{color:#a7d4bb;font-size:12px;margin:4px 0 0}}
  .body{{padding:32px}}
  .hero{{font-size:22px;font-weight:bold;color:#111;margin:0 0 12px}}
  p{{color:#444;line-height:1.6;margin:0 0 16px;font-size:15px}}
  .btn{{display:inline-block;background:#1A5C38;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;margin-top:8px}}
  .btn-gold{{background:#D4A017;color:#1A5C38}}
  .order-box{{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:20px 0}}
  .order-row{{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#555}}
  .order-row:last-child{{border:none;font-weight:bold;color:#111;font-size:15px}}
  .item-row{{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px}}
  .item-row:last-child{{border:none}}
  .item-name{{font-weight:600;color:#333}}
  .item-qty{{color:#888;font-size:12px}}
  .item-price{{font-weight:bold;color:#1A5C38}}
  .stat-num{{font-size:24px;font-weight:900;color:#1A5C38;margin:0}}
  .stat-label{{font-size:12px;color:#555;margin-top:4px}}
  .footer{{background:#f9fafb;padding:24px 32px;text-align:center;color:#888;font-size:12px;border-top:1px solid #eee}}
  .footer a{{color:#1A5C38;text-decoration:none}}
  hr{{border:none;border-top:1px solid #eee;margin:20px 0}}
</style></head><body>
<div class="container">
  <div class="header">
    <h1 class="logo">AFRIZONE</h1>
    <p class="tagline">Connecting Africa to the World</p>
  </div>
  <div class="body">{body}</div>
  <div class="footer">
    <p>Afrizone — Authentic African Commerce<br>
    <a href="{FRONTEND_URL}">Shop Now</a> &middot; <a href="{FRONTEND_URL}/orders">My Orders</a></p>
  </div>
</div></body></html>"""


def send_email(to_email: str, subject: str, html_content: str):
    if not SENDGRID_API_KEY:
        print(f"[EMAIL SKIPPED] To: {to_email} | {subject}")
        return
    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        sg.send(Mail(from_email=(FROM_EMAIL, FROM_NAME), to_emails=to_email, subject=subject, html_content=html_content))
        print(f"[EMAIL SENT] To: {to_email} | {subject}")
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")


def send_welcome_email(user_email: str, user_name: str):
    body = f"""<h2 class="hero">Welcome to Afrizone, {user_name}! </h2>
    <p>You have joined Africa's premier marketplace in the diaspora. Discover authentic products from verified African businesses across the USA, Canada and Europe.</p>
    <ul style="color:#444;line-height:2;font-size:15px">
      <li>Shop from verified African stores</li>
      <li>Save favourites to your wishlist</li>
      <li>Track your orders in real-time</li>
      <li>Leave reviews for products you love</li>
    </ul>
    <a href="{FRONTEND_URL}" class="btn">Start Shopping</a>"""
    send_email(user_email, "Welcome to Afrizone! 🌍", _wrap(body))


def send_seller_approved(seller_email: str, seller_name: str, store_name: str):
    body = f"""<h2 class="hero">Your store is approved!</h2>
    <p>Great news {seller_name}! <strong>{store_name}</strong> is now live on Afrizone.</p>
    <p>Customers can now discover and buy your products.</p>
    <a href="{FRONTEND_URL}/seller/dashboard" class="btn btn-gold">Go to Dashboard</a>"""
    send_email(seller_email, f"✅ {store_name} is now live on Afrizone!", _wrap(body))


def send_order_confirmation(buyer_email: str, buyer_name: str, order_id: int,
                             items: list, subtotal: float, shipping: float, total: float,
                             store_name: str = ""):
    items_html = "".join([f"""<div class="item-row">
      <div><div class="item-name">{i['name']}</div><div class="item-qty">Qty: {i['quantity']}</div></div>
      <div class="item-price">${i['price'] * i['quantity']:.2f}</div></div>""" for i in items])
    body = f"""<h2 class="hero">Order Confirmed!</h2>
    <p>Hi {buyer_name}, your order from <strong>{store_name}</strong> has been placed.</p>
    <div class="order-box"><p style="margin:0 0 12px;font-weight:bold">Order #{order_id}</p>
      {items_html}<hr>
      <div class="order-row"><span>Subtotal</span><span>${subtotal:.2f}</span></div>
      <div class="order-row"><span>Shipping</span><span>{"FREE" if shipping == 0 else f"${shipping:.2f}"}</span></div>
      <div class="order-row"><span>Total</span><span>${total:.2f}</span></div>
    </div>
    <a href="{FRONTEND_URL}/orders" class="btn">Track Order</a>"""
    send_email(buyer_email, f"Afrizone Order #{order_id} Confirmed ✅", _wrap(body))


def send_new_order_to_seller(seller_email: str, store_name: str, order_id: int,
                              items: list, total: float, seller_amount: float, buyer_name: str = ""):
    items_html = "".join([f"""<div class="item-row">
      <div><div class="item-name">{i['name']}</div><div class="item-qty">Qty: {i['quantity']}</div></div>
      <div class="item-price">${i['price'] * i['quantity']:.2f}</div></div>""" for i in items])
    body = f"""<h2 class="hero">New order!</h2>
    <p>You have a new order at <strong>{store_name}</strong>{f" from {buyer_name}" if buyer_name else ""}.</p>
    <div class="order-box"><p style="margin:0 0 12px;font-weight:bold">Order #{order_id}</p>
      {items_html}<hr>
      <div class="order-row"><span>Order Total</span><span>${total:.2f}</span></div>
      <div class="order-row"><span>Your Earnings</span><span style="color:#1A5C38">${seller_amount:.2f}</span></div>
    </div>
    <a href="{FRONTEND_URL}/seller/dashboard" class="btn btn-gold">View in Dashboard</a>"""
    send_email(seller_email, f"New Order #{order_id} — {store_name}", _wrap(body))


def send_shipping_update(buyer_email: str, buyer_name: str, order_id: int,
                          tracking_number: str = None, tracking_url: str = None, store_name: str = ""):
    tracking_html = ""
    if tracking_number:
        tracking_html = f"""<div class="order-box" style="text-align:center">
          <p style="margin:0 0 4px;font-size:12px;color:#888;font-weight:bold">TRACKING NUMBER</p>
          <p style="margin:0;font-size:20px;font-family:monospace;font-weight:bold;color:#1A5C38">{tracking_number}</p>
          {f'<a href="{tracking_url}" style="display:inline-block;margin-top:8px;color:#1A5C38;font-size:13px">Track Package</a>' if tracking_url else ""}
        </div>"""
    body = f"""<h2 class="hero">Your order has shipped!</h2>
    <p>Hi {buyer_name}, order #{order_id} from <strong>{store_name}</strong> is on its way.</p>
    {tracking_html}
    <a href="{FRONTEND_URL}/orders" class="btn">Track Order</a>"""
    send_email(buyer_email, f"Order #{order_id} has shipped! 🚚", _wrap(body))


def send_delivery_confirmation(buyer_email: str, buyer_name: str, order_id: int, store_name: str = ""):
    body = f"""<h2 class="hero">Order Delivered!</h2>
    <p>Hi {buyer_name}, your order #{order_id} from <strong>{store_name}</strong> has been delivered.</p>
    <p>We hope you love your purchase! Share your experience by leaving a review.</p>
    <a href="{FRONTEND_URL}/orders" class="btn">Leave a Review</a>"""
    send_email(buyer_email, f"Order #{order_id} has been delivered! 📦", _wrap(body))


def send_low_stock_alert(seller_email: str, store_name: str, product_name: str, stock: int):
    body = f"""<h2 class="hero">Low stock alert</h2>
    <p><strong>{product_name}</strong> at <strong>{store_name}</strong> is running low.</p>
    <div class="order-box" style="text-align:center">
      <p class="stat-num" style="color:#D97706">{stock}</p>
      <p class="stat-label">units remaining</p>
    </div>
    <a href="{FRONTEND_URL}/seller/products" class="btn btn-gold">Update Stock</a>"""
    send_email(seller_email, f"Low stock: {product_name} ({stock} left)", _wrap(body))


def send_password_reset(user_email: str, user_name: str, reset_url: str):
    first = user_name.split()[0] if user_name else "there"
    html = _wrap(f"""
        <div class="body">
            <p class="hero">Reset your password 🔐</p>
            <p>Hi {first},</p>
            <p>We received a request to reset your Afrizone password. Click the button below to choose a new password:</p>
            <div style="text-align:center;margin:28px 0">
                <a href="{reset_url}" class="btn btn-gold">Reset My Password →</a>
            </div>
            <div class="order-box" style="text-align:center">
                <p style="margin:0;font-size:13px;color:#888">⏰ This link expires in <strong>1 hour</strong></p>
            </div>
            <p style="font-size:13px;color:#888">If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
            <hr/>
            <p style="font-size:12px;color:#aaa;text-align:center">
                If the button doesn't work, copy this link:<br/>
                <a href="{reset_url}" style="color:#1A5C38;word-break:break-all">{reset_url}</a>
            </p>
        </div>
    """)
    send_email(user_email, "Reset your Afrizone password", html)

def send_generic_email(user_email: str, user_name: str, subject: str, body: str):
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#1a5c38;padding:20px;border-radius:8px 8px 0 0;text-align:center">
        <h1 style="color:#f5a623;margin:0;font-size:24px">🌍 AFRIZONE</h1>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #eee;border-radius:0 0 8px 8px">
        <p>Hi {user_name},</p>
        <p>{body}</p>
        <p style="margin-top:24px;color:#666;font-size:12px">
          Afrizone · afrizoneshop.com · support@afrizoneshop.com
        </p>
      </div>
    </div>"""
    send_email(user_email, subject, html)
