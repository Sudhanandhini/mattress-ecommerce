'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, ShoppingBag, Lock, LogOut, ChevronRight,
  Save, Eye, EyeOff, CheckCircle, Package, RefreshCw,
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
  total: string; createdAt: string;
  items: { productName: string; quantity: number; product: { images: { url: string }[] } }[];
}

function AccountContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { user, token, setAuth, logout } = useAuthStore();
  const loggedIn = !!token && !!user;
  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'profile');

  // Redirect if not logged in
  useEffect(() => {
    if (!loggedIn) router.replace('/');
  }, [loggedIn, router]);

  // ── Profile state ──────────────────────────────────────────────────
  const [profile, setProfile]   = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '', phone: user?.phone || '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Password state ─────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false });
  const [savingPw, setSavingPw] = useState(false);

  // ── Orders state ───────────────────────────────────────────────────
  const [orders, setOrders]         = useState<Order[]>([]);
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
    if (tab === 'orders' && token && !ordersLoaded) {
      fetchOrders(token);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, token]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res  = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(profile),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      // Update auth store with new user data
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

  const handleLogout = () => {
    logout();
    toast.success('Signed out');
    router.push('/');
  };

  // Sync tab from URL
  useEffect(() => {
    const t = searchParams.get('tab') as Tab;
    if (t && ['profile', 'orders', 'password'].includes(t)) setTab(t);
  }, [searchParams]);

  if (!loggedIn) return null;

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email?.split('@')[0] || 'User';
  const initials    = (user?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase();

  const tabs = [
    { key: 'profile' as Tab, label: 'Profile',  icon: User },
    { key: 'orders'  as Tab, label: 'My Orders', icon: ShoppingBag },
    { key: 'password'as Tab, label: 'Password',  icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b py-2.5">
        <div className="container mx-auto px-4">
          <nav className="flex items-center gap-1.5 text-xs text-gray-500">
            <Link href="/" className="hover:text-indigo-600 transition">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-800 font-medium">My Account</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* ── Sidebar ─────────────────────────────────────────── */}
          <div className="space-y-3">
            {/* User card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-2xl mx-auto mb-3">
                {initials}
              </div>
              <p className="font-bold text-gray-900">{displayName}</p>
              <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
              {user?.phone && <p className="text-xs text-gray-400">{user.phone}</p>}
            </div>

            {/* Nav */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {tabs.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition border-b border-gray-50 last:border-0 ${
                      tab === t.key
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {t.label}
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
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">

              {/* ── Profile Tab ── */}
              {tab === 'profile' && (
                <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100">
                      <h2 className="text-base font-bold text-gray-900">Profile Information</h2>
                      <p className="text-xs text-gray-400 mt-0.5">Update your personal details</p>
                    </div>
                    <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">First Name</label>
                          <input
                            value={profile.firstName}
                            onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))}
                            placeholder="First name"
                            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 transition"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Last Name</label>
                          <input
                            value={profile.lastName}
                            onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))}
                            placeholder="Last name"
                            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 transition"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Email Address</label>
                        <input
                          value={user?.email || ''}
                          readOnly
                          className="w-full px-3 py-2.5 text-sm border border-gray-100 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Phone Number</label>
                        <input
                          value={profile.phone}
                          onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                          placeholder="Phone number" type="tel"
                          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 transition"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition disabled:opacity-60"
                      >
                        {savingProfile
                          ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                          : <><Save className="w-4 h-4" /> Save Changes</>
                        }
                      </button>
                    </form>
                  </div>
                </motion.div>
              )}

              {/* ── Orders Tab ── */}
              {tab === 'orders' && (
                <motion.div key="orders" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-bold text-gray-900">My Orders</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Track and view your order history</p>
                      </div>
                      <button
                        onClick={() => { setOrdersLoaded(false); if (token) fetchOrders(token); }}
                        className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-600"
                        title="Refresh"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>

                    {ordersLoading ? (
                      <div className="flex items-center justify-center py-16">
                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                        <Package className="w-12 h-12 opacity-30" />
                        <p className="text-sm">No orders yet</p>
                        <Link href="/products" className="text-indigo-600 text-sm font-medium hover:underline">Start Shopping</Link>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {orders.map(order => (
                          <div key={order.id} className="p-5 hover:bg-gray-50/50 transition">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-mono font-bold text-gray-800 text-sm">{order.orderNumber}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                                    {order.status}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-400">
                                  {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                              <p className="font-bold text-gray-900">₹{fmt(Math.round(parseFloat(order.total)))}</p>
                            </div>

                            {/* Items preview */}
                            <div className="flex gap-2 mt-3 flex-wrap">
                              {order.items.slice(0, 3).map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
                                  {item.product.images?.[0]?.url ? (
                                    <img src={item.product.images[0].url} alt="" className="w-6 h-6 rounded object-cover" />
                                  ) : <span className="text-base">🛏️</span>}
                                  <span className="text-xs text-gray-700 font-medium">{item.productName}</span>
                                  <span className="text-xs text-gray-400">×{item.quantity}</span>
                                </div>
                              ))}
                              {order.items.length > 3 && (
                                <span className="text-xs text-gray-400 flex items-center">+{order.items.length - 3} more</span>
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
                <motion.div key="password" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100">
                      <h2 className="text-base font-bold text-gray-900">Change Password</h2>
                      <p className="text-xs text-gray-400 mt-0.5">Keep your account secure</p>
                    </div>
                    <form onSubmit={handleChangePassword} className="p-6 space-y-4 max-w-md">
                      {[
                        { key: 'current' as const, label: 'Current Password',  placeholder: 'Enter current password' },
                        { key: 'newPw'   as const, label: 'New Password',       placeholder: 'At least 6 characters' },
                        { key: 'confirm' as const, label: 'Confirm New Password', placeholder: 'Re-enter new password' },
                      ].map(field => (
                        <div key={field.key}>
                          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">{field.label}</label>
                          <div className="relative">
                            <input
                              type={showPw[field.key] ? 'text' : 'password'}
                              value={pwForm[field.key]}
                              onChange={e => setPwForm(f => ({ ...f, [field.key]: e.target.value }))}
                              placeholder={field.placeholder}
                              className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 transition"
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

                      <button
                        type="submit"
                        disabled={savingPw}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition disabled:opacity-60"
                      >
                        {savingPw
                          ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Updating...</>
                          : <><CheckCircle className="w-4 h-4" /> Update Password</>
                        }
                      </button>
                    </form>
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <AccountContent />
    </Suspense>
  );
}
