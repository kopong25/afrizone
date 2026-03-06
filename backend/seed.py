"""
Afrizone Database Seed Script
Run with: python seed.py
Creates sample categories, stores, and products so the marketplace isn't empty.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine
import models
from auth import hash_password
from slugify import slugify

models.Base.metadata.create_all(bind=engine)
db = SessionLocal()

print("🌍 Seeding Afrizone database...")

# ── Categories ──────────────────────────────────────────
cats = [
    ("Food & Groceries", "food-groceries", "🍲"),
    ("Fashion & Clothing", "fashion", "👗"),
    ("Beauty & Hair", "beauty-hair", "💄"),
    ("Arts & Crafts", "arts-crafts", "🎨"),
    ("Electronics", "electronics", "📱"),
    ("Books & Media", "books-media", "📚"),
    ("Health & Wellness", "health-wellness", "🌿"),
    ("Home & Living", "home-living", "🏠"),
]
cat_map = {}
for name, slug, icon in cats:
    existing = db.query(models.Category).filter(models.Category.slug == slug).first()
    if not existing:
        c = models.Category(name=name, slug=slug, icon=icon)
        db.add(c)
        db.flush()
        cat_map[slug] = c.id
    else:
        cat_map[slug] = existing.id
db.commit()
print(f"  ✅ {len(cats)} categories created")

# ── Admin User ───────────────────────────────────────────
admin = db.query(models.User).filter(models.User.email == "admin@afrizone.com").first()
if not admin:
    admin = models.User(
        email="admin@afrizone.com",
        hashed_password=hash_password("admin1234"),
        full_name="Afrizone Admin",
        role=models.UserRole.admin,
        country="USA",
    )
    db.add(admin)
    db.commit()
    print("  ✅ Admin user created (admin@afrizone.com / admin1234)")

# ── Sample Sellers & Stores ──────────────────────────────
sellers_data = [
    {
        "email": "lagos.foods@afrizone.com",
        "full_name": "Amaka Obi",
        "store_name": "Lagos Foods & Spices",
        "country": "USA",
        "city": "Houston, TX",
        "business_type": "Food & Groceries",
        "description": "Authentic Nigerian spices, grains, and pantry staples shipped across the USA. Family-owned since 2015.",
        "logo": "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=200&h=200&fit=crop",
        "banner": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=1200&h=400&fit=crop",
    },
    {
        "email": "ankara.boutique@afrizone.com",
        "full_name": "Fatou Diallo",
        "store_name": "Ankara Boutique",
        "country": "USA",
        "city": "Atlanta, GA",
        "business_type": "Fashion",
        "description": "Beautiful hand-crafted Ankara and Kente fashion. We ship to all 50 states and Canada.",
        "logo": "https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=200&h=200&fit=crop",
        "banner": "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1200&h=400&fit=crop",
    },
    {
        "email": "shea.beauty@afrizone.com",
        "full_name": "Abena Mensah",
        "store_name": "Shea Beauty Co.",
        "country": "Canada",
        "city": "Toronto, ON",
        "business_type": "Beauty & Hair",
        "description": "100% natural African beauty products. Raw shea butter, black soap, and natural hair care.",
        "logo": "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=200&h=200&fit=crop",
        "banner": "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=1200&h=400&fit=crop",
    },
    {
        "email": "afro.arts@afrizone.com",
        "full_name": "Kofi Asante",
        "store_name": "Afro Arts Gallery",
        "country": "UK",
        "city": "London",
        "business_type": "Arts & Crafts",
        "description": "Original African art, sculptures, and handcrafted items from across the continent.",
        "logo": "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=200&h=200&fit=crop",
        "banner": "https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=1200&h=400&fit=crop",
    },
]

store_map = {}
for i, s in enumerate(sellers_data):
    user = db.query(models.User).filter(models.User.email == s["email"]).first()
    if not user:
        user = models.User(
            email=s["email"],
            hashed_password=hash_password("seller1234"),
            full_name=s["full_name"],
            role=models.UserRole.seller,
            country=s["country"],
        )
        db.add(user)
        db.flush()

    store = db.query(models.Store).filter(models.Store.owner_id == user.id).first()
    if not store:
        slug = slugify(s["store_name"])
        store = models.Store(
            owner_id=user.id,
            name=s["store_name"],
            slug=slug,
            description=s["description"],
            logo_url=s["logo"],
            banner_url=s["banner"],
            country=s["country"],
            city=s["city"],
            business_type=s["business_type"],
            status=models.SellerStatus.approved,
            tier=models.SellerTier.standard,
            total_sales=20 + i * 15,
            avg_rating=4.2 + (i * 0.1),
            review_count=8 + i * 5,
        )
        db.add(store)
        db.flush()
    store_map[s["email"]] = store.id

db.commit()
print(f"  ✅ {len(sellers_data)} seller stores created")

# ── Sample Products ──────────────────────────────────────
products_data = [
    # Lagos Foods
    {
        "store_email": "lagos.foods@afrizone.com",
        "category": "food-groceries",
        "name": "Ofada Rice (5kg)",
        "description": "Premium Nigerian Ofada rice, unpolished and naturally grown. Rich in nutrients with a unique aroma. Perfect for Ofada stew.",
        "price": 24.99, "compare_price": 32.00, "stock": 150,
        "country_of_origin": "Nigeria",
        "tags": ["rice", "nigerian", "ofada", "organic"],
        "images": ["https://images.unsplash.com/photo-1536304993881-ff86e0c9de7e?w=600&h=600&fit=crop"],
        "sale_count": 45, "avg_rating": 4.8, "review_count": 23,
    },
    {
        "store_email": "lagos.foods@afrizone.com",
        "category": "food-groceries",
        "name": "Egusi Seeds Ground (500g)",
        "description": "Freshly ground egusi (melon seeds) for authentic West African soups. Stone-ground for maximum flavor.",
        "price": 12.99, "stock": 200,
        "country_of_origin": "Nigeria",
        "tags": ["egusi", "soup", "nigerian food", "west african"],
        "images": ["https://images.unsplash.com/photo-1559181567-c3190bfbf6b9?w=600&h=600&fit=crop"],
        "sale_count": 67, "avg_rating": 4.9, "review_count": 41,
    },
    {
        "store_email": "lagos.foods@afrizone.com",
        "category": "food-groceries",
        "name": "Jollof Rice Spice Mix",
        "description": "Secret blend of spices for the perfect party jollof rice. Nigerian recipe passed down 3 generations.",
        "price": 8.99, "compare_price": 11.99, "stock": 300,
        "country_of_origin": "Nigeria",
        "tags": ["jollof", "spices", "seasoning", "nigerian"],
        "images": ["https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600&h=600&fit=crop"],
        "sale_count": 120, "avg_rating": 4.7, "review_count": 58, "is_featured": True,
    },
    {
        "store_email": "lagos.foods@afrizone.com",
        "category": "food-groceries",
        "name": "Palm Oil Cold-Pressed (1L)",
        "description": "Unrefined red palm oil, cold-pressed from fresh palm fruits. No additives, no preservatives.",
        "price": 15.99, "stock": 80,
        "country_of_origin": "Ghana",
        "tags": ["palm oil", "cooking oil", "unrefined", "ghanaian"],
        "images": ["https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&h=600&fit=crop"],
        "sale_count": 34, "avg_rating": 4.6, "review_count": 19,
    },
    # Ankara Boutique
    {
        "store_email": "ankara.boutique@afrizone.com",
        "category": "fashion",
        "name": "Ankara Maxi Dress",
        "description": "Stunning handmade Ankara maxi dress with traditional Ghanaian print. Available in sizes XS–3XL. Each dress is unique.",
        "price": 89.99, "compare_price": 120.00, "stock": 25,
        "country_of_origin": "Ghana",
        "tags": ["ankara", "dress", "african print", "fashion", "kente"],
        "images": ["https://images.unsplash.com/photo-1614786269829-d24616faf56d?w=600&h=600&fit=crop"],
        "sale_count": 28, "avg_rating": 4.9, "review_count": 17, "is_featured": True,
    },
    {
        "store_email": "ankara.boutique@afrizone.com",
        "category": "fashion",
        "name": "Kente Kite Scarf",
        "description": "Handwoven Kente fabric scarf from Kumasi, Ghana. Vibrant colors, authentic craftsmanship. One size fits all.",
        "price": 34.99, "stock": 40,
        "country_of_origin": "Ghana",
        "tags": ["kente", "scarf", "handwoven", "ghanaian"],
        "images": ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=600&fit=crop"],
        "sale_count": 15, "avg_rating": 4.7, "review_count": 9,
    },
    {
        "store_email": "ankara.boutique@afrizone.com",
        "category": "fashion",
        "name": "Men's Dashiki Shirt",
        "description": "Classic African dashiki shirt in vibrant Ankara print. Perfect for celebrations, parties, or everyday wear.",
        "price": 49.99, "compare_price": 65.00, "stock": 35,
        "country_of_origin": "Nigeria",
        "tags": ["dashiki", "men", "shirt", "african print"],
        "images": ["https://images.unsplash.com/photo-1594938298603-c8148c4b4c8b?w=600&h=600&fit=crop"],
        "sale_count": 22, "avg_rating": 4.5, "review_count": 13,
    },
    # Shea Beauty
    {
        "store_email": "shea.beauty@afrizone.com",
        "category": "beauty-hair",
        "name": "Raw Shea Butter (500g)",
        "description": "Unrefined Grade A shea butter from Northern Ghana. Moisturises skin and hair naturally. No chemicals added.",
        "price": 19.99, "compare_price": 28.00, "stock": 120,
        "country_of_origin": "Ghana",
        "tags": ["shea butter", "natural", "skincare", "hair care", "ghanaian"],
        "images": ["https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&h=600&fit=crop"],
        "sale_count": 89, "avg_rating": 4.9, "review_count": 52, "is_featured": True,
    },
    {
        "store_email": "shea.beauty@afrizone.com",
        "category": "beauty-hair",
        "name": "African Black Soap (250g)",
        "description": "Authentic Ghanaian black soap made from plantain skin ash, palm oil, and shea butter. Great for all skin types.",
        "price": 12.99, "stock": 200,
        "country_of_origin": "Ghana",
        "tags": ["black soap", "natural", "skincare", "acne", "ghanaian"],
        "images": ["https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=600&fit=crop"],
        "sale_count": 103, "avg_rating": 4.8, "review_count": 67,
    },
    {
        "store_email": "shea.beauty@afrizone.com",
        "category": "beauty-hair",
        "name": "Chebe Hair Powder (100g)",
        "description": "Traditional Chadian chebe powder for hair growth and length retention. Used for centuries in Chad and Sudan.",
        "price": 22.99, "compare_price": 30.00, "stock": 75,
        "country_of_origin": "Chad",
        "tags": ["chebe", "hair growth", "natural hair", "african"],
        "images": ["https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=600&h=600&fit=crop"],
        "sale_count": 56, "avg_rating": 4.7, "review_count": 34,
    },
    # Afro Arts
    {
        "store_email": "afro.arts@afrizone.com",
        "category": "arts-crafts",
        "name": "Hand-Carved Wooden Mask",
        "description": "Authentic hand-carved wooden ceremonial mask from Ivory Coast. Each piece is unique and signed by the artisan.",
        "price": 149.99, "compare_price": 200.00, "stock": 8,
        "country_of_origin": "Ivory Coast",
        "tags": ["mask", "carved", "wood", "ceremonial", "art"],
        "images": ["https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=600&h=600&fit=crop"],
        "sale_count": 6, "avg_rating": 5.0, "review_count": 5, "is_featured": True,
    },
    {
        "store_email": "afro.arts@afrizone.com",
        "category": "arts-crafts",
        "name": "Beaded Jewelry Set",
        "description": "Handmade Maasai beaded necklace and bracelet set from Kenya. Vibrant colors, traditional patterns.",
        "price": 39.99, "stock": 30,
        "country_of_origin": "Kenya",
        "tags": ["jewelry", "beads", "maasai", "kenyan", "handmade"],
        "images": ["https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&h=600&fit=crop"],
        "sale_count": 18, "avg_rating": 4.8, "review_count": 12,
    },
]

created = 0
for p in products_data:
    store_id = store_map.get(p["store_email"])
    if not store_id:
        continue
    cat_id = cat_map.get(p["category"])
    slug = slugify(p["name"])
    existing = db.query(models.Product).filter(models.Product.slug == slug).first()
    if not existing:
        product = models.Product(
            store_id=store_id,
            category_id=cat_id,
            name=p["name"],
            slug=slug,
            description=p["description"],
            price=p["price"],
            compare_price=p.get("compare_price"),
            stock=p["stock"],
            images=p["images"],
            country_of_origin=p.get("country_of_origin"),
            tags=p.get("tags", []),
            sale_count=p.get("sale_count", 0),
            avg_rating=p.get("avg_rating", 0.0),
            review_count=p.get("review_count", 0),
            is_featured=p.get("is_featured", False),
            is_active=True,
        )
        db.add(product)
        created += 1

db.commit()
print(f"  ✅ {created} products created")
print("\n🚀 Seed complete! Your marketplace is ready.")
print("\n📋 Test accounts:")
print("   Admin:  admin@afrizone.com     / admin1234")
print("   Seller: lagos.foods@afrizone.com / seller1234")
print("   Seller: ankara.boutique@afrizone.com / seller1234")
print("   Seller: shea.beauty@afrizone.com / seller1234")
print("\n🌐 Visit: http://localhost:3000")
db.close()
