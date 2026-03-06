from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
import os

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
FROM_EMAIL = os.getenv("FROM_EMAIL", "hello@afrizone.com")
FROM_NAME = os.getenv("FROM_NAME", "Afrizone")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


def send_email(to_email: str, subject: str, html_content: str):
    """Send an email via SendGrid."""
    if not SENDGRID_API_KEY:
        print(f"[EMAIL SKIPPED — no SENDGRID_API_KEY] To: {to_email} | Subject: {subject}")
        return

    message = Mail(
        from_email=(FROM_EMAIL, FROM_NAME),
        to_emails=to_email,
        subject=subject,
        html_content=html_content,
    )
    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        sg.send(message)
    except Exception as e:
        print(f"Email error: {e}")


def send_welcome_email(user_email: str, user_name: str):
    send_email(
        to_email=user_email,
        subject="Welcome to Afrizone! 🌍",
        html_content=f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
          <div style="background:#1A5C38;padding:30px;text-align:center">
            <h1 style="color:#D4A017;margin:0">AFRIZONE</h1>
          </div>
          <div style="padding:30px">
            <h2>Welcome, {user_name}! 🎉</h2>
            <p>You've joined Afrizone — the home for African commerce in the diaspora.</p>
            <p>Start discovering authentic African products from stores across the USA, Canada & Europe.</p>
            <a href="{FRONTEND_URL}" style="background:#1A5C38;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:16px">
              Shop Now
            </a>
          </div>
          <div style="background:#f5f5f5;padding:20px;text-align:center;color:#666;font-size:12px">
            © Afrizone — Connecting Africa to the World
          </div>
        </div>
        """
    )


def send_order_confirmation(buyer_email: str, buyer_name: str, order_id: int, total: float):
    send_email(
        to_email=buyer_email,
        subject=f"Afrizone Order #{order_id} Confirmed ✅",
        html_content=f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
          <div style="background:#1A5C38;padding:30px;text-align:center">
            <h1 style="color:#D4A017;margin:0">AFRIZONE</h1>
          </div>
          <div style="padding:30px">
            <h2>Order Confirmed, {buyer_name}!</h2>
            <p>Your order <strong>#{order_id}</strong> has been placed successfully.</p>
            <p>Total: <strong>${total:.2f}</strong></p>
            <a href="{FRONTEND_URL}/orders/{order_id}" style="background:#1A5C38;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:16px">
              Track Your Order
            </a>
          </div>
        </div>
        """
    )


def send_new_order_to_seller(seller_email: str, store_name: str, order_id: int, total: float):
    send_email(
        to_email=seller_email,
        subject=f"🛍️ New Order #{order_id} — {store_name}",
        html_content=f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
          <div style="background:#1A5C38;padding:30px;text-align:center">
            <h1 style="color:#D4A017;margin:0">AFRIZONE</h1>
          </div>
          <div style="padding:30px">
            <h2>You have a new order! 🎉</h2>
            <p>Order <strong>#{order_id}</strong> has been placed at <strong>{store_name}</strong>.</p>
            <p>Order value: <strong>${total:.2f}</strong></p>
            <a href="{FRONTEND_URL}/seller/orders/{order_id}" style="background:#D4A017;color:#1A5C38;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:16px;font-weight:bold">
              View Order
            </a>
          </div>
        </div>
        """
    )
