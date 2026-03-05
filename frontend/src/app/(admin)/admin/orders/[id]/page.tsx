'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Save, Package, MapPin, CreditCard, User, Clock } from 'lucide-react';

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: string;
  paymentMethod: string;
  subtotal: string;
  discount: string;
  shippingCharge: string;
  tax: string;
  total: string;
  couponCode: string | null;
  couponDiscount: string | null;
  trackingNumber: string | null;
  customerNotes: string | null;
  adminNotes: string | null;
  createdAt: string;
  estimatedDelivery: string | null;
  deliveredAt: string | null;
  user: { firstName: string | null; lastName: string | null; email: string; phone: string | null };
  shippingAddress: {
    firstName: string; lastName: string; phone: string;
    addressLine1: string; addressLine2: string | null;
    city: string; state: string; pincode: string;
  };
  items: {
    id: string; productName: string; variantName: string | null;
    quantity: number; price: string; total: string;
    product: { name: string; slug: string; images: { url: string }[] };
    variant: { size: string; thickness: string | null; firmness: string | null } | null;
  }[];
  payment: { razorpayOrderId: string | null; razorpayPaymentId: string | null } | null;
  statusHistory: { id: string; status: string; notes: string | null; createdAt: string }[];
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING:    'bg-yellow-100 text-yellow-700',
  CONFIRMED:  'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-indigo-100 text-indigo-700',
  SHIPPED:    'bg-purple-100 text-purple-700',
  DELIVERED:  'bg-green-100 text-green-700',
  CANCELLED:  'bg-red-100 text-red-700',
  REFUNDED:   'bg-gray-100 text-gray-600',
};

const ALL_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

function fmt(n: number) {
  return n.toLocaleString('en-IN');
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
        <Icon className="w-4 h-4 text-indigo-500" />
        <h2 className="font-semibold text-gray-800 text-sm">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [order, setOrder]     = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  const [editStatus,   setEditStatus]   = useState<OrderStatus>('PENDING');
  const [editTracking, setEditTracking] = useState('');
  const [editNotes,    setEditNotes]    = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      const res  = await fetch(`/api/admin/orders/${id}`);
      const json = await res.json();
      if (json.success) {
        setOrder(json.data);
        setEditStatus(json.data.status);
        setEditTracking(json.data.trackingNumber || '');
        setEditNotes(json.data.adminNotes || '');
      }
      setLoading(false);
    })();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: editStatus, trackingNumber: editTracking, adminNotes: editNotes }),
      });
      // refresh
      const res  = await fetch(`/api/admin/orders/${id}`);
      const json = await res.json();
      if (json.success) setOrder(json.data);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!order) return (
    <div className="text-center py-24 text-gray-500">Order not found.</div>
  );

  const subtotal = parseFloat(order.subtotal);
  const discount = parseFloat(order.discount || '0');
  const shipping = parseFloat(order.shippingCharge || '0');
  const tax      = parseFloat(order.tax || '0');
  const total    = parseFloat(order.total);

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/orders" className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-600">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Order {order.orderNumber}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(order.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${STATUS_COLORS[order.status]}`}>
          {order.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">

          {/* Order Items */}
          <Section title="Order Items" icon={Package}>
            <div className="space-y-3">
              {order.items.map(item => (
                <div key={item.id} className="flex gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                  <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden shrink-0">
                    {item.product.images?.[0]?.url ? (
                      <img src={item.product.images[0].url} alt="" className="w-full h-full object-cover" />
                    ) : <div className="w-full h-full flex items-center justify-center text-xl">🛏️</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">{item.productName}</p>
                    {item.variant && (
                      <p className="text-xs text-gray-400">
                        {[item.variant.size, item.variant.thickness, item.variant.firmness].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-0.5">
                      ₹{fmt(Math.round(parseFloat(item.price)))} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm shrink-0">
                    ₹{fmt(Math.round(parseFloat(item.total)))}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          {/* Customer */}
          <Section title="Customer" icon={User}>
            <div className="space-y-1.5 text-sm text-gray-600">
              <p><span className="font-medium text-gray-800">
                {order.user ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() || '—' : '—'}
              </span></p>
              <p>{order.user?.email}</p>
              <p>{order.user?.phone}</p>
            </div>
          </Section>

          {/* Shipping Address */}
          <Section title="Shipping Address" icon={MapPin}>
            {order.shippingAddress ? (
              <div className="text-sm text-gray-600 space-y-0.5">
                <p className="font-medium text-gray-800">
                  {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                </p>
                <p>{order.shippingAddress.phone}</p>
                <p>{order.shippingAddress.addressLine1}</p>
                {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                <p>{order.shippingAddress.city}, {order.shippingAddress.state} – {order.shippingAddress.pincode}</p>
              </div>
            ) : <p className="text-sm text-gray-400">No address on file.</p>}
          </Section>

          {/* Status History */}
          {order.statusHistory?.length > 0 && (
            <Section title="Status History" icon={Clock}>
              <div className="space-y-3">
                {order.statusHistory.map(h => (
                  <div key={h.id} className="flex gap-3 items-start">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{h.status}</p>
                      {h.notes && <p className="text-xs text-gray-400">{h.notes}</p>}
                      <p className="text-xs text-gray-300">
                        {new Date(h.createdAt).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">

          {/* Order Summary */}
          <Section title="Order Summary" icon={CreditCard}>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>₹{fmt(Math.round(subtotal))}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount {order.couponCode && `(${order.couponCode})`}</span>
                  <span>-₹{fmt(Math.round(discount))}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>{shipping === 0 ? <span className="text-green-600">Free</span> : `₹${fmt(shipping)}`}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax (GST)</span>
                <span>₹{fmt(Math.round(tax))}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 border-t border-gray-100 pt-2 mt-1 text-base">
                <span>Total</span>
                <span>₹{fmt(Math.round(total))}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Payment Method</span>
                <span className="font-medium">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Status</span>
                <span className={`font-semibold ${order.paymentStatus === 'PAID' ? 'text-green-600' : order.paymentStatus === 'FAILED' ? 'text-red-500' : 'text-yellow-600'}`}>
                  {order.paymentStatus}
                </span>
              </div>
              {order.payment?.razorpayPaymentId && (
                <div className="flex justify-between">
                  <span>Payment ID</span>
                  <span className="font-mono text-xs">{order.payment.razorpayPaymentId}</span>
                </div>
              )}
            </div>
          </Section>

          {/* Update Order */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800 text-sm">Update Order</h2>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Order Status</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as OrderStatus)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 transition bg-white"
                >
                  {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Tracking Number</label>
                <input
                  value={editTracking}
                  onChange={e => setEditTracking(e.target.value)}
                  placeholder="Enter tracking number"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 transition"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Admin Notes</label>
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  rows={3}
                  placeholder="Internal notes..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 transition resize-none"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4" /> Save Changes</>
                )}
              </button>
            </div>
          </div>

          {/* Customer Notes */}
          {order.customerNotes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-700 mb-1">Customer Notes</p>
              <p className="text-sm text-amber-800">{order.customerNotes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
