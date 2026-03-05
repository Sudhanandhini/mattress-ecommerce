'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trash2, Plus, Minus, ShoppingCart, ChevronRight,
  Phone, CheckCircle, LogIn, Lock,
} from 'lucide-react';
import { useCartStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import { AuthModal } from '@/components/auth/AuthModal';
import toast from 'react-hot-toast';

function fmt(n: number) {
  return n.toLocaleString('en-IN');
}

const SHIPPING = 0;

export default function CartPage() {
  const { items, removeItem, updateQty, clearCart, subtotal } = useCartStore();
  const { user, token, isLoggedIn } = useAuthStore();
  const loggedIn = isLoggedIn();

  const [placing, setPlacing]         = useState(false);
  const [ordered, setOrdered]         = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', city: '', state: '', pincode: '', notes: '',
  });

  // Pre-fill form when user logs in
  useEffect(() => {
    if (user) {
      setForm(f => ({
        ...f,
        name:  [user.firstName, user.lastName].filter(Boolean).join(' ') || f.name,
        phone: user.phone || f.phone,
        email: user.email || f.email,
      }));
    }
  }, [user]);

  const sub   = subtotal();
  const tax   = Math.round(sub * 0.18);
  const total = sub + tax + SHIPPING;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const doPlaceOrder = async () => {
    if (!form.name || !form.phone || !form.address) {
      toast.error('Please fill name, phone and address.');
      return;
    }
    setPlacing(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name:     form.name,
          phone:    form.phone,
          email:    form.email || undefined,
          address:  form.address,
          city:     form.city,
          state:    form.state,
          pincode:  form.pincode,
          notes:    form.notes,
          subtotal: sub,
          tax,
          total,
          items: items.map(i => ({
            productId:    i.productId,
            variantId:    i.variantId,
            productName:  i.productName,
            variantLabel: i.variantLabel,
            price:        i.price,
            quantity:     i.quantity,
          })),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setOrderNumber(json.data.orderNumber);
      clearCart();
      setOrdered(true);
    } catch {
      toast.error('Failed to place order. Please try again or call us.');
    } finally {
      setPlacing(false);
    }
  };

  const handleOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedIn) {
      setShowAuthModal(true);
      return;
    }
    doPlaceOrder();
  };

  // ── Success screen ────────────────────────────────────────────────
  if (ordered) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h2>
          {orderNumber && (
            <p className="text-indigo-600 font-mono font-bold text-sm mb-2">Order #{orderNumber}</p>
          )}
          <p className="text-gray-500 text-sm max-w-sm">
            Thank you! We have received your order and will call you shortly to confirm.
          </p>
        </div>
        <Link href="/products" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition">
          Continue Shopping
        </Link>
      </div>
    );
  }

  // ── Empty cart ────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
          <ShoppingCart className="w-10 h-10 text-gray-300" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Your cart is empty</h2>
          <p className="text-gray-400 text-sm">Add products to get started.</p>
        </div>
        <Link href="/products" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition">
          Browse Products
        </Link>
      </div>
    );
  }

  // ── Main cart ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b py-2.5">
        <div className="container mx-auto px-4">
          <nav className="flex items-center gap-1.5 text-xs text-gray-500">
            <Link href="/" className="hover:text-indigo-600 transition">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-800 font-medium">Cart</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Cart Items ──────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-3">
            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={`${item.productId}-${item.variantId}`}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex gap-4"
                >
                  <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-100 shrink-0 bg-gray-50">
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-3xl">🛏️</div>
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <Link href={`/products/${item.productSlug}`} className="font-semibold text-gray-900 text-sm hover:text-indigo-600 transition line-clamp-2">
                      {item.productName}
                    </Link>
                    {item.variantLabel && (
                      <p className="text-xs text-gray-400 mt-0.5">{item.variantLabel}</p>
                    )}
                    <p className="text-indigo-700 font-bold mt-1">₹{fmt(item.price)}</p>

                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => updateQty(item.productId, item.variantId, item.quantity - 1)} className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition">
                        <Minus className="w-3 h-3 text-gray-600" />
                      </button>
                      <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateQty(item.productId, item.variantId, item.quantity + 1)} className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition">
                        <Plus className="w-3 h-3 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-between shrink-0">
                    <button onClick={() => { removeItem(item.productId, item.variantId); toast.success('Removed from cart'); }} className="p-1.5 hover:bg-red-50 rounded-lg transition text-gray-300 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <p className="text-sm font-bold text-gray-800">₹{fmt(item.price * item.quantity)}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* ── Right column ────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Order Summary */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-base font-bold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span><span>₹{fmt(sub)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>GST (18%)</span><span>₹{fmt(tax)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery</span><span className="text-green-600 font-medium">Free</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-100 pt-3 mt-2">
                  <span>Total</span><span>₹{fmt(total)}</span>
                </div>
              </div>
            </div>

            {/* Login prompt or Delivery Form */}
            {!loggedIn ? (
              /* ── Not logged in: show login prompt ── */
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center space-y-4">
                <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Login to Place Order</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Sign in or create an account to complete your purchase and track your orders.
                  </p>
                </div>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" /> Sign In / Register
                </button>
                <p className="text-xs text-gray-400">Your cart items are saved.</p>
              </div>
            ) : (
              /* ── Logged in: delivery form ── */
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                {/* Logged-in user badge */}
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                    {(user?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">
                      {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Customer'}
                    </p>
                    <p className="text-xs text-gray-400">{user?.email}</p>
                  </div>
                </div>

                <h2 className="text-base font-bold text-gray-900 mb-4">Delivery Details</h2>
                <form onSubmit={handleOrder} className="space-y-3">
                  <input
                    name="name" value={form.name} onChange={handleChange}
                    placeholder="Full Name *"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 transition"
                    required
                  />
                  <input
                    name="phone" value={form.phone} onChange={handleChange}
                    placeholder="Phone Number *" type="tel"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 transition"
                    required
                  />
                  <input
                    name="email" value={form.email} onChange={handleChange}
                    placeholder="Email" type="email"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 transition bg-gray-50"
                    readOnly={!!user?.email}
                  />
                  <textarea
                    name="address" value={form.address} onChange={handleChange}
                    placeholder="Delivery Address *" rows={2}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 transition resize-none"
                    required
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input name="city"  value={form.city}  onChange={handleChange} placeholder="City"  className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 transition" />
                    <input name="state" value={form.state} onChange={handleChange} placeholder="State" className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 transition" />
                  </div>
                  <input
                    name="pincode" value={form.pincode} onChange={handleChange}
                    placeholder="Pincode"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 transition"
                  />
                  <textarea
                    name="notes" value={form.notes} onChange={handleChange}
                    placeholder="Order notes (optional)" rows={2}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 transition resize-none"
                  />
                  <button
                    type="submit"
                    disabled={placing}
                    className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {placing
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Placing Order...</>
                      : <><Phone className="w-4 h-4" /> Place Order</>
                    }
                  </button>
                  <p className="text-xs text-gray-400 text-center">
                    We will call you to confirm your order and arrange delivery.
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <AuthModal
            onClose={() => setShowAuthModal(false)}
            onSuccess={() => setShowAuthModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
