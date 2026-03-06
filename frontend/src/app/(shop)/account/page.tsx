'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, ShoppingBag, Lock, LogOut, ChevronRight,
  Save, Eye, EyeOff, CheckCircle, Package, RefreshCw,
  Mail, Phone, BadgeCheck, Calendar, MapPin, CreditCard, Banknote,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import toast from 'react-hot-toast';

type Tab = 'profile' | 'orders' | 'password';

const STATUS_COLORS: Record<string, string> = {
  PENDING:    'bg-yellow-100 text-yellow-700',
  CONFIRMED:  'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-indigo-100 text-indigo-700',
  SHIPPED:    'bg-purple-100 text-purple-700',
  DELIVERED:  'bg-green-100 text-green-700',
  CANCELLED:  'bg-red-100 text-red-700',
  REFUNDED:   'bg-gray-100 text-gray-600',
};

function fmt(n: number) { return n.toLocaleString('en-IN'); }

interface Order {
  id: string; orderNumber: string; status: string;
  paymentMethod: string; paymentStatus: string;
  total: string; createdAt: string;
  shippingAddress: { addressLine1: string; city: string; state: string; pincode: string } | null;
  items: { productName: string; quantity: number; product: { images: { url: string }[] } }[];
}

function AccountContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { user, token, setAuth, logout } = useAuthStore();
  const loggedIn = !!token && !!user;
  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'profile');

  useEffect(() => {
    if (!loggedIn) router.replace('/');
  }, [loggedIn, router]);

  // ── Profile state ──────────────────────────────────────────────────
  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    lastName:  user?.lastName  || '',
    email:     user?.email     || '',
    phone:     user?.phone     || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Password state ─────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false });
  const [savingPw, setSavingPw] = useState(false);

  // ── Orders state ───────────────────────────────────────────────────
  const [orders, setOrders]               = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersLoaded, setOrdersLoaded]   = useState(false);

  const fetchOrders = (authToken: string) => {
    setOrdersLoading(true);
    fetch('/api/auth/orders', { headers: { Authorization: `Bearer ${authToken}` } })
      .then(r => r.json())
      .then(j => {
        if (j.success) { setOrders(j.data); setOrdersLoaded(true); }
        else toast.error('Could not load orders');
      })
      .catch(() => toast.error('Could not load orders'))
      .finally(() => setOrdersLoading(false));
  };

  useEffect(() => {
    if (tab === 'orders' && token) {
      setOrdersLoaded(false);
      fetchOrders(token);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, token]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.email.trim()) { toast.error('Email is required'); return; }
    setSavingProfile(true);
    try {
      const res  = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(profile),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setAuth({ ...user!, ...json.data }, token!);
      toast.success('Profile updated!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
    if (pwForm.newPw.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSavingPw(true);
    try {
      const res  = await fetch('/api/auth/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.newPw }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast.success('Password changed successfully!');
      setPwForm({ current: '', newPw: '', confirm: '' });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setSavingPw(false);
    }
  };

  const handleLogout = () => { logout(); toast.success('Signed out'); router.push('/'); };

  useEffect(() => {
    const t = searchParams.get('tab') as Tab;
    if (t && ['profile', 'orders', 'password'].includes(t)) setTab(t);
  }, [searchParams]);

  if (!loggedIn) return null;

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email?.split('@')[0] || 'User';
  const initials    = (user?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase();

  const tabs = [
    { key: 'profile'  as Tab, label: 'My Profile',  icon: User },
    { key: 'orders'   as Tab, label: 'My Orders',   icon: ShoppingBag },
    { key: 'password' as Tab, label: 'Password',    icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <nav className="flex items-center gap-1.5 text-xs text-gray-500">
            <Link href="/" className="hover:text-indigo-600 transition">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-800 font-medium">My Account</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── Sidebar ─────────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-4">

            {/* Profile card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Gradient header */}
              <div className="h-20 bg-gradient-to-r from-indigo-500 to-purple-600" />
              <div className="px-5 pb-5 -mt-10">
                <div className="w-20 h-20 rounded-2xl bg-white shadow-md flex items-center justify-center text-indigo-700 font-bold text-3xl border-4 border-white mb-3">
                  {initials}
                </div>
                <p className="font-bold text-gray-900 text-base">{displayName}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <BadgeCheck className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-xs text-green-600 font-medium">Verified Account</span>
                </div>
                <div className="mt-3 space-y-1.5">
                  {user?.email && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>
                  )}
                  {user?.phone && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                  {(user as { createdAt?: string })?.createdAt && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>Joined {new Date((user as { createdAt?: string }).createdAt!).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {tabs.map(t => {
                const Icon = t.icon;
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition border-b border-gray-50 last:border-0 ${
                      active ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-500' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-indigo-600' : 'text-gray-400'}`} />
                    {t.label}
                    {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-indigo-400" />}
                  </button>
                );
              })}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-medium text-red-500 hover:bg-red-50 transition"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>

          {/* ── Main Content ─────────────────────────────────────── */}
          <div className="lg:col-span-9">
            <AnimatePresence mode="wait">

              {/* ── Profile Tab ── */}
              {tab === 'profile' && (
                <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="space-y-4">

                    {/* Header */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5">
                      <h2 className="text-lg font-bold text-gray-900">Profile Information</h2>
                      <p className="text-sm text-gray-400 mt-0.5">Manage your personal details and contact information</p>
                    </div>

                    {/* Form card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      <form onSubmit={handleSaveProfile}>
                        {/* Personal Info Section */}
                        <div className="px-6 py-5 border-b border-gray-50">
                          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center">
                              <User className="w-3.5 h-3.5 text-indigo-600" />
                            </span>
                            Personal Details
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">First Name</label>
                              <input
                                value={profile.firstName}
                                onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))}
                                placeholder="Enter first name"
                                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition bg-gray-50 focus:bg-white"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">Last Name</label>
                              <input
                                value={profile.lastName}
                                onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))}
                                placeholder="Enter last name"
                                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition bg-gray-50 focus:bg-white"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Contact Info Section */}
                        <div className="px-6 py-5">
                          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center">
                              <Mail className="w-3.5 h-3.5 text-indigo-600" />
                            </span>
                            Contact Information
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">Email Address</label>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                  type="email"
                                  value={profile.email}
                                  onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                                  placeholder="your@email.com"
                                  required
                                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition bg-gray-50 focus:bg-white"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">Phone Number</label>
                              <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                  type="tel"
                                  value={profile.phone}
                                  onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                                  placeholder="+91 98765 43210"
                                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition bg-gray-50 focus:bg-white"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Save button */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                          <p className="text-xs text-gray-400">All fields can be edited and saved.</p>
                          <button
                            type="submit"
                            disabled={savingProfile}
                            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 active:scale-95 transition disabled:opacity-60 shadow-sm"
                          >
                            {savingProfile
                              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                              : <><Save className="w-4 h-4" /> Save Changes</>
                            }
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Orders Tab ── */}
              {tab === 'orders' && (
                <motion.div key="orders" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">My Orders</h2>
                        <p className="text-sm text-gray-400 mt-0.5">Track and view your order history</p>
                      </div>
                      <button
                        onClick={() => { setOrdersLoaded(false); if (token) fetchOrders(token); }}
                        className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-400 hover:text-gray-600"
                        title="Refresh"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>

                    {ordersLoading ? (
                      <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                        <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center">
                          <Package className="w-10 h-10 opacity-30" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">No orders yet</p>
                        <p className="text-xs text-gray-400">Your order history will appear here</p>
                        <Link href="/products" className="mt-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition">
                          Start Shopping
                        </Link>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {orders.map(order => (
                          <div key={order.id} className="p-5 hover:bg-gray-50/60 transition">
                            {/* Top row: order # + status + total */}
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div>
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="font-mono font-bold text-gray-800 text-sm">{order.orderNumber}</span>
                                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                                    {order.status}
                                  </span>
                                  {/* Payment status */}
                                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                    order.paymentStatus === 'PAID'   ? 'bg-green-100 text-green-700' :
                                    order.paymentStatus === 'FAILED' ? 'bg-red-100 text-red-600'     :
                                    'bg-yellow-50 text-yellow-700'
                                  }`}>
                                    {order.paymentStatus}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-400">
                                  {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-bold text-gray-900 text-base">₹{fmt(Math.round(parseFloat(order.total)))}</p>
                                <p className="text-xs text-gray-400">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
                              </div>
                            </div>

                            {/* Items chips */}
                            <div className="flex gap-2 mt-3 flex-wrap">
                              {order.items.slice(0, 3).map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-indigo-50/60 border border-indigo-100/60 rounded-lg px-3 py-1.5">
                                  {item.product.images?.[0]?.url
                                    ? <img src={item.product.images[0].url} alt="" className="w-6 h-6 rounded object-cover" />
                                    : <span className="text-base">🛏️</span>}
                                  <span className="text-xs text-gray-700 font-medium">{item.productName}</span>
                                  <span className="text-xs text-indigo-400 font-semibold">×{item.quantity}</span>
                                </div>
                              ))}
                              {order.items.length > 3 && (
                                <span className="text-xs text-gray-400 flex items-center">+{order.items.length - 3} more</span>
                              )}
                            </div>

                            {/* Footer: payment method + delivery city */}
                            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50 flex-wrap">
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                {order.paymentMethod === 'RAZORPAY'
                                  ? <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                                  : <Banknote className="w-3.5 h-3.5 text-green-500" />
                                }
                                <span className="font-medium">{order.paymentMethod === 'RAZORPAY' ? 'Paid Online' : 'Cash on Delivery'}</span>
                              </div>
                              {order.shippingAddress && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                  <span>{order.shippingAddress.city}, {order.shippingAddress.state}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── Password Tab ── */}
              {tab === 'password' && (
                <motion.div key="password" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5">
                      <h2 className="text-lg font-bold text-gray-900">Change Password</h2>
                      <p className="text-sm text-gray-400 mt-0.5">Keep your account secure with a strong password</p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      <form onSubmit={handleChangePassword}>
                        <div className="px-6 py-6 space-y-5">
                          {[
                            { key: 'current' as const, label: 'Current Password',    placeholder: 'Enter your current password' },
                            { key: 'newPw'   as const, label: 'New Password',         placeholder: 'At least 6 characters' },
                            { key: 'confirm' as const, label: 'Confirm New Password', placeholder: 'Re-enter new password' },
                          ].map(field => (
                            <div key={field.key}>
                              <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">{field.label}</label>
                              <div className="relative max-w-sm">
                                <input
                                  type={showPw[field.key] ? 'text' : 'password'}
                                  value={pwForm[field.key]}
                                  onChange={e => setPwForm(f => ({ ...f, [field.key]: e.target.value }))}
                                  placeholder={field.placeholder}
                                  className="w-full px-4 py-2.5 pr-10 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition bg-gray-50 focus:bg-white"
                                  required
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPw(s => ({ ...s, [field.key]: !s[field.key] }))}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                  {showPw[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                          <p className="text-xs text-gray-400">Use a mix of letters, numbers, and symbols for a strong password.</p>
                          <button
                            type="submit"
                            disabled={savingPw}
                            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 active:scale-95 transition disabled:opacity-60 shadow-sm"
                          >
                            {savingPw
                              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Updating...</>
                              : <><CheckCircle className="w-4 h-4" /> Update Password</>
                            }
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AccountContent />
    </Suspense>
  );
}
