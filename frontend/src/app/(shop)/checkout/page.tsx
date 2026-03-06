'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronRight, CheckCircle, Lock, LogIn, Truck,
  CreditCard, Banknote, ShoppingBag, Loader2,
} from 'lucide-react';
import { useCartStore, useBuyNowStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import { AuthModal } from '@/components/auth/AuthModal';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';

declare global {
  interface Window {
    Razorpay: any;
  }
}

function fmt(n: number) {
  return n.toLocaleString('en-IN');
}

const SHIPPING = 0;

type PaymentMethod = 'COD' | 'RAZORPAY';

export default function CheckoutPage() {
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const source        = searchParams.get('source'); // 'buynow' or null (cart)

  const { items: cartItems, subtotal: cartSubtotal, clearCart } = useCartStore();
  const { item: buyNowItem, clear: clearBuyNow }                = useBuyNowStore();
  const { user, token, isLoggedIn }                             = useAuthStore();
  const loggedIn = isLoggedIn();

  const [payMethod, setPayMethod]     = useState<PaymentMethod>('COD');
  const [placing, setPlacing]         = useState(false);
  const [ordered, setOrdered]         = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', city: '', state: '', pincode: '', notes: '',
  });

  // Pre-fill user info
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

  // Determine items to checkout
  const checkoutItems = source === 'buynow' && buyNowItem
    ? [buyNowItem]
    : cartItems;

  const sub   = source === 'buynow' && buyNowItem
    ? buyNowItem.price * buyNowItem.quantity
    : cartSubtotal();
  const tax   = Math.round(sub * 0.18);
  const total = sub + tax + SHIPPING;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const validateForm = () => {
    if (!form.name || !form.phone || !form.address) {
      toast.error('Please fill name, phone and address.');
      return false;
    }
    return true;
  };

  // ── Place order (COD or after Razorpay success) ────────────────────
  const placeOrder = async (rzpPaymentId?: string, rzpOrderId?: string, rzpSignature?: string) => {
    setPlacing(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name:          form.name,
          phone:         form.phone,
          email:         form.email || undefined,
          address:       form.address,
          city:          form.city,
          state:         form.state,
          pincode:       form.pincode,
          notes:         form.notes,
          subtotal:      sub,
          tax,
          total,
          paymentMethod: payMethod,
          razorpayPaymentId: rzpPaymentId,
          razorpayOrderId:   rzpOrderId,
          razorpaySignature: rzpSignature,
          items: checkoutItems.map(i => ({
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
      if (!json.success) throw new Error(json.message || 'Order creation failed');
      setOrderNumber(json.data.orderNumber);
      if (source === 'buynow') clearBuyNow();
      else clearCart();
      setOrdered(true);
    } catch (err: any) {
      console.error('Place order error:', err);
      toast.error(err?.message || 'Failed to place order. Please try again or call us.');
    } finally {
      setPlacing(false);
    }
  };

  // ── COD flow ──────────────────────────────────────────────────────
  const handleCOD = async () => {
    if (!validateForm()) return;
    await placeOrder();
  };

  // ── Razorpay flow ─────────────────────────────────────────────────
  const loadRazorpayScript = () =>
    new Promise<boolean>(resolve => {
      if (window.Razorpay) { resolve(true); return; }
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload  = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  const handleRazorpay = async () => {
    if (!validateForm()) return;
    setPlacing(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) { toast.error('Could not load Razorpay. Check your connection.'); setPlacing(false); return; }

      // Create Razorpay order on server
      const res = await fetch('/api/payments/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: total }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      const options = {
        key:      data.key,
        amount:   data.amount,
        currency: 'INR',
        name:     'Mattress Factory',
        description: checkoutItems.map(i => i.productName).join(', '),
        order_id: data.orderId,
        prefill: {
          name:    form.name,
          email:   form.email,
          contact: form.phone,
        },
        theme: { color: '#4f46e5' },
        handler: async (response: any) => {
          try {
            setPlacing(true);
            // Verify signature on server
            const verifyRes = await fetch('/api/payments/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
              }),
            });
            const vData = await verifyRes.json();
            if (!vData.success) {
              toast.error('Payment verification failed. Please contact support with payment ID: ' + response.razorpay_payment_id);
              setPlacing(false);
              return;
            }
            // Place order with payment details
            await placeOrder(
              response.razorpay_payment_id,
              response.razorpay_order_id,
              response.razorpay_signature
            );
          } catch (err) {
            console.error('Razorpay handler error:', err);
            toast.error('Payment was received but order creation failed. Please contact support with payment ID: ' + response.razorpay_payment_id);
            setPlacing(false);
          }
        },
        modal: {
          ondismiss: () => { setPlacing(false); },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      toast.error('Could not initiate payment. Please try again.');
      setPlacing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedIn) { setShowAuthModal(true); return; }
    if (payMethod === 'COD') handleCOD();
    else handleRazorpay();
  };

  // ── Redirect if nothing to checkout ──────────────────────────────
  if (!placing && !ordered && checkoutItems.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6 px-4">
        <ShoppingBag className="w-14 h-14 text-gray-200" />
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Nothing to checkout</h2>
          <p className="text-gray-400 text-sm">Go back and add products first.</p>
        </div>
        <Link href="/products" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition">
          Browse Products
        </Link>
      </div>
    );
  }

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
            {payMethod === 'RAZORPAY'
              ? 'Payment successful! Your order is confirmed.'
              : 'Thank you! We will call you shortly to confirm delivery.'}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/products" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition">
            Continue Shopping
          </Link>
          <Link href="/account?tab=orders" className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition">
            My Orders
          </Link>
        </div>
      </div>
    );
  }

  // ── Main checkout ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b py-2.5">
        <div className="container mx-auto px-4">
          <nav className="flex items-center gap-1.5 text-xs text-gray-500">
            <Link href="/" className="hover:text-indigo-600 transition">Home</Link>
            <ChevronRight className="w-3 h-3" />
            {source !== 'buynow' && (
              <>
                <Link href="/cart" className="hover:text-indigo-600 transition">Cart</Link>
                <ChevronRight className="w-3 h-3" />
              </>
            )}
            <span className="text-gray-800 font-medium">Checkout</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left: Delivery + Payment ───────────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Items summary */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-base font-bold text-gray-900 mb-3">
                {checkoutItems.length} Item{checkoutItems.length > 1 ? 's' : ''}
              </h2>
              <div className="space-y-3">
                {checkoutItems.map((item, i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <div className="w-14 h-14 rounded-lg overflow-hidden border border-gray-100 shrink-0 bg-gray-50">
                      {item.imageUrl
                        ? <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-2xl">🛏️</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 line-clamp-1">{item.productName}</p>
                      {item.variantLabel && <p className="text-xs text-gray-400">{item.variantLabel}</p>}
                      <p className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-bold text-indigo-700 shrink-0">₹{fmt(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Auth gate or form */}
            {!loggedIn ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center space-y-4">
                <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Login to Continue</h3>
                  <p className="text-sm text-gray-400">Sign in to complete your purchase.</p>
                </div>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" /> Sign In / Register
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Delivery Details */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  {/* User badge */}
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

                  <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-indigo-500" /> Delivery Details
                  </h2>
                  <div className="space-y-3">
                    <input
                      name="name" value={form.name} onChange={handleChange}
                      placeholder="Full Name *" required
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 transition"
                    />
                    <input
                      name="phone" value={form.phone} onChange={handleChange}
                      placeholder="Phone Number *" type="tel" required
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 transition"
                    />
                    <input
                      name="email" value={form.email} onChange={handleChange}
                      placeholder="Email" type="email" readOnly={!!user?.email}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 transition bg-gray-50"
                    />
                    <textarea
                      name="address" value={form.address} onChange={handleChange}
                      placeholder="Delivery Address *" rows={2} required
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 transition resize-none"
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
                  </div>
                </div>

                {/* Payment Method */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-indigo-500" /> Payment Method
                  </h2>
                  <div className="space-y-3">

                    {/* COD */}
                    <label className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition ${payMethod === 'COD' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input
                        type="radio" name="payMethod" value="COD"
                        checked={payMethod === 'COD'}
                        onChange={() => setPayMethod('COD')}
                        className="accent-indigo-600"
                      />
                      <Banknote className="w-5 h-5 text-green-600 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Cash on Delivery</p>
                        <p className="text-xs text-gray-400">Pay when your order arrives</p>
                      </div>
                      <span className="ml-auto text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">Free</span>
                    </label>

                    {/* Razorpay */}
                    <label className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition ${payMethod === 'RAZORPAY' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input
                        type="radio" name="payMethod" value="RAZORPAY"
                        checked={payMethod === 'RAZORPAY'}
                        onChange={() => setPayMethod('RAZORPAY')}
                        className="accent-indigo-600"
                      />
                      <CreditCard className="w-5 h-5 text-blue-600 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Pay Online</p>
                        <p className="text-xs text-gray-400">UPI, Cards, Net Banking via Razorpay</p>
                      </div>
                      <span className="ml-auto">
                        <img src="https://razorpay.com/favicon.ico" alt="Razorpay" className="w-5 h-5 rounded" />
                      </span>
                    </label>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={placing}
                  className={`w-full py-4 rounded-xl font-bold text-base transition active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm ${
                    payMethod === 'RAZORPAY'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {placing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                  ) : payMethod === 'RAZORPAY' ? (
                    <><CreditCard className="w-4 h-4" /> Pay ₹{fmt(total)} Online</>
                  ) : (
                    <><Banknote className="w-4 h-4" /> Place Order (COD)</>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* ── Right: Order Summary ─────────────────────────── */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sticky top-4">
              <h2 className="text-base font-bold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span><span>₹{fmt(sub)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>GST (18%)</span><span>₹{fmt(tax)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery</span>
                  <span className="text-green-600 font-medium">Free</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-100 pt-3 mt-2">
                  <span>Total</span><span>₹{fmt(total)}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Truck className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  <span>Free delivery across India</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <CheckCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>100% secure payments</span>
                </div>
              </div>
            </div>
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
