'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { Phone, Package, CheckCircle, Clock, Search, Plus, X, Eye, Send, LogOut, Calendar, MessageCircle } from 'lucide-react';
import type { Order, OrderForm, Stats } from '../types';
import type { Session } from '@supabase/supabase-js';

export default function Dashboard() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'orders' | 'history'>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats>({ inProgress: 0, ready: 0, completed: 0 });
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showOrderDetail, setShowOrderDetail] = useState<Order | null>(null);
  const [showExtendDate, setShowExtendDate] = useState<Order | null>(null);
  const [newDeliveryDate, setNewDeliveryDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [newOrderStep, setNewOrderStep] = useState(1);
  const [orderForm, setOrderForm] = useState<OrderForm>({
    customerName: '',
    customerPhone: '',
    items: '',
    measurements: '',
    price: '',
    advancePayment: '',
    deliveryDate: '',
    notes: ''
  });

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
        return;
      }
      setSession(session);
      setLoading(false);
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/auth');
      } else {
        setSession(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (session) {
      fetchOrders();
    }
  }, [session]);

  const fetchOrders = async () => {
    if (!session) return;
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('shop_id', session.user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data as Order[]);
      calculateStats(data as Order[]);
    }
  };

  const calculateStats = (ordersData: Order[]) => {
    const newStats: Stats = {
      inProgress: ordersData.filter(o => o.status === 'In Progress').length,
      ready: ordersData.filter(o => o.status === 'Ready').length,
      completed: ordersData.filter(o => o.status === 'Completed').length
    };
    setStats(newStats);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  const sendWhatsAppMessage = (phone: string, message: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // --- UPDATED FUNCTION START ---
  const handleCreateOrder = async () => {
    if (!session || !orderForm.customerName || !orderForm.customerPhone) {
      alert('Please fill in customer name and phone number');
      return;
    }

    console.log('Creating order with data:', {
      shop_id: session.user.id,
      customer_name: orderForm.customerName,
      customer_phone: orderForm.customerPhone,
      items: orderForm.items,
      measurements: orderForm.measurements,
      price: parseFloat(orderForm.price) || 0,
      advance_payment: parseFloat(orderForm.advancePayment) || 0,
      delivery_date: orderForm.deliveryDate,
      notes: orderForm.notes,
      status: 'In Progress'
    });

    const { data, error } = await supabase.from('orders').insert([{
      shop_id: session.user.id,
      customer_name: orderForm.customerName,
      customer_phone: orderForm.customerPhone,
      items: orderForm.items,
      measurements: orderForm.measurements,
      price: parseFloat(orderForm.price) || 0,
      advance_payment: parseFloat(orderForm.advancePayment) || 0,
      delivery_date: orderForm.deliveryDate,
      notes: orderForm.notes,
      status: 'In Progress'
    }]).select();

    if (error) {
      console.error('Supabase error:', error);
      alert(`Error creating order: ${error.message}`);
      return;
    }

    if (!error && data) {
      setShowNewOrder(false);
      setNewOrderStep(1);
      setOrderForm({
        customerName: '',
        customerPhone: '',
        items: '',
        measurements: '',
        price: '',
        advancePayment: '',
        deliveryDate: '',
        notes: ''
      });
      fetchOrders();
      
      // Send WhatsApp confirmation
      const shopNameText = session.user.user_metadata?.shop_name || 'our shop';
      const message = `Hello ${orderForm.customerName}! ✨

Your order has been received at ${shopNameText}.

📦 Items: ${orderForm.items}
📅 Expected Delivery: ${orderForm.deliveryDate}
💰 Total: ₹${orderForm.price}
✅ Advance Paid: ₹${orderForm.advancePayment}

We'll notify you when your order is ready for pickup. Thank you! 🙏`;
      
      sendWhatsAppMessage(orderForm.customerPhone, message);
    }
  };
  // --- UPDATED FUNCTION END ---

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    if (!session) return;
    
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (!error) {
      fetchOrders();
      
      if (newStatus === 'Ready') {
        const shopNameText = session.user.user_metadata?.shop_name || 'our shop';
        const message = `Good news ${order.customer_name}! 🎉

Your order is now ready for pickup at ${shopNameText}! ✅

📦 Items: ${order.items}
💰 Balance Due: ₹${order.price - order.advance_payment}

Please collect it at your earliest convenience. We're open and waiting for you! 😊`;
        
        sendWhatsAppMessage(order.customer_phone, message);
      }
    }
  };

  const handleExtendDeliveryDate = async () => {
    if (!showExtendDate || !newDeliveryDate) {
      alert('Please select a new delivery date');
      return;
    }

    const { error } = await supabase
      .from('orders')
      .update({ delivery_date: newDeliveryDate })
      .eq('id', showExtendDate.id);

    if (!error) {
      fetchOrders();
      
      const shopNameText = session?.user.user_metadata?.shop_name || 'our shop';
      const message = `Hello ${showExtendDate.customer_name},

We apologize for the delay. Your order at ${shopNameText} needs a little more time to ensure perfect quality. 🎯

📦 Items: ${showExtendDate.items}
📅 New Delivery Date: ${newDeliveryDate}

We appreciate your patience and promise it will be worth the wait! Thank you for understanding. 🙏`;
      
      sendWhatsAppMessage(showExtendDate.customer_phone, message);
      
      setShowExtendDate(null);
      setNewDeliveryDate('');
    }
  };

  const filteredOrders = orders.filter(order =>
    order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer_phone.includes(searchQuery)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-emerald-400 text-xl">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="backdrop-blur-xl bg-white/5 border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Is It Ready?</h1>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-emerald-300 text-sm">{session.user.user_metadata?.shop_name || 'Shop'}</div>
              <div className="text-gray-400 text-xs">{session.user.email}</div>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-3">
          {(['dashboard', 'orders', 'history'] as const).map(view => (
            <button
              key={view}
              onClick={() => setCurrentView(view)}
              className={`px-6 py-2 rounded-xl font-medium transition-all ${
                currentView === view
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Dashboard View */}
        {currentView === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="backdrop-blur-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-2xl p-6 border border-orange-400/30 shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-orange-300 text-sm mb-1">In Progress</div>
                    <div className="text-4xl font-bold text-white">{stats.inProgress}</div>
                  </div>
                  <Clock className="text-orange-400" size={40} />
                </div>
              </div>
              
              <div className="backdrop-blur-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-2xl p-6 border border-emerald-400/30 shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-emerald-300 text-sm mb-1">Ready for Pickup</div>
                    <div className="text-4xl font-bold text-white">{stats.ready}</div>
                  </div>
                  <Package className="text-emerald-400" size={40} />
                </div>
              </div>
              
              <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-2xl p-6 border border-blue-400/30 shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-blue-300 text-sm mb-1">Completed</div>
                    <div className="text-4xl font-bold text-white">{stats.completed}</div>
                  </div>
                  <CheckCircle className="text-blue-400" size={40} />
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowNewOrder(true)}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={24} />
              New Order
            </button>

            <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4">Recent Orders</h2>
              <div className="space-y-3">
                {orders.slice(0, 5).map(order => (
                  <div
                    key={order.id}
                    onClick={() => setShowOrderDetail(order)}
                    className="backdrop-blur-xl bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-semibold">{order.customer_name}</div>
                        <div className="text-gray-400 text-sm">{order.items}</div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        order.status === 'In Progress' ? 'bg-orange-500/20 text-orange-300 border border-orange-400/30' :
                        order.status === 'Ready' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' :
                        'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                      }`}>
                        {order.status}
                      </div>
                    </div>
                  </div>
                ))}
                {orders.length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    No orders yet. Create your first order!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Orders View */}
        {currentView === 'orders' && (
          <div className="space-y-6">
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-4 border border-white/20">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  aria-label="Search orders"
                  title="Search orders"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>

            <div className="grid gap-4">
              {filteredOrders.filter(o => o.status !== 'Completed').map(order => (
                <div key={order.id} className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">{order.customer_name}</h3>
                      <div className="text-emerald-300 flex items-center gap-2 mt-1">
                        <Phone size={16} />
                        {order.customer_phone}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowOrderDetail(order)}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                      title="View Details"
                      aria-label="View Details"
                    >
                      <Eye size={20} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <div className="text-gray-400">Items</div>
                      <div className="text-white">{order.items}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Delivery</div>
                      <div className="text-white">{order.delivery_date || 'Not set'}</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {order.status === 'In Progress' && (
                      <>
                        <button
                          onClick={() => updateOrderStatus(order.id, 'Ready')}
                          className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          <CheckCircle size={18} />
                          Mark as Ready
                        </button>
                        <button
                          onClick={() => {
                            setShowExtendDate(order);
                            setNewDeliveryDate(order.delivery_date || '');
                          }}
                          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
                          title="Extend Delivery Date"
                          aria-label="Extend Delivery Date"
                        >
                          <Calendar size={18} />
                        </button>
                      </>
                    )}
                    {order.status === 'Ready' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'Completed')}
                        className="flex-1 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium hover:shadow-lg transition-all"
                      >
                        Mark as Completed
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {filteredOrders.filter(o => o.status !== 'Completed').length === 0 && (
                <div className="text-center text-gray-400 py-8 backdrop-blur-xl bg-white/5 rounded-2xl">
                  No active orders
                </div>
              )}
            </div>
          </div>
        )}

        {/* History View */}
        {currentView === 'history' && (
          <div className="space-y-4">
            {orders.filter(o => o.status === 'Completed').map(order => (
              <div key={order.id} className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/10">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">{order.customer_name}</h3>
                    <div className="text-gray-400 text-sm">{order.items}</div>
                    <div className="text-emerald-300 text-sm mt-1">₹{order.price}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-400 text-sm">{new Date(order.created_at).toLocaleDateString()}</div>
                    <div className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-medium border border-blue-400/30 mt-2">
                      Completed
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {orders.filter(o => o.status === 'Completed').length === 0 && (
              <div className="text-center text-gray-400 py-8 backdrop-blur-xl bg-white/5 rounded-2xl">
                No completed orders yet
              </div>
            )}
          </div>
        )}
      </main>

      {/* New Order Modal */}
      {showNewOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="backdrop-blur-xl bg-slate-900/95 rounded-3xl p-8 max-w-2xl w-full border border-white/20 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">New Order</h2>
              <button
                onClick={() => {
                  setShowNewOrder(false);
                  setNewOrderStep(1);
                }}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                title="Close"
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-6">
              <div className="flex gap-2">
                {[1, 2, 3].map(step => (
                  <div
                    key={step}
                    className={`flex-1 h-2 rounded-full ${
                      step <= newOrderStep ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {newOrderStep === 1 && (
                <>
                  <div>
                    <label htmlFor="customerName" className="text-emerald-300 text-sm mb-2 block">Customer Name *</label>
                    <input
                      id="customerName"
                      type="text"
                      value={orderForm.customerName}
                      onChange={(e) => setOrderForm({...orderForm, customerName: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div>
                    <label htmlFor="customerPhone" className="text-emerald-300 text-sm mb-2 block">Phone Number * (with country code)</label>
                    <input
                      id="customerPhone"
                      type="tel"
                      value={orderForm.customerPhone}
                      onChange={(e) => setOrderForm({...orderForm, customerPhone: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      placeholder="919876543210"
                    />
                    <p className="text-gray-400 text-xs mt-1">Format: Country code + number (e.g., 919876543210 for India)</p>
                  </div>
                  <div>
                    <label htmlFor="items" className="text-emerald-300 text-sm mb-2 block">Items</label>
                    <textarea
                      id="items"
                      value={orderForm.items}
                      onChange={(e) => setOrderForm({...orderForm, items: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      rows={3}
                      placeholder="Shirt, Pant, etc."
                    />
                  </div>
                </>
              )}

              {newOrderStep === 2 && (
                <>
                  <div>
                    <label htmlFor="measurements" className="text-emerald-300 text-sm mb-2 block">Measurements</label>
                    <textarea
                      id="measurements"
                      value={orderForm.measurements}
                      onChange={(e) => setOrderForm({...orderForm, measurements: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      rows={4}
                      placeholder="Chest: 38, Waist: 32, etc."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="price" className="text-emerald-300 text-sm mb-2 block">Total Price (₹)</label>
                      <input
                        id="price"
                        type="number"
                        value={orderForm.price}
                        onChange={(e) => setOrderForm({...orderForm, price: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label htmlFor="advancePayment" className="text-emerald-300 text-sm mb-2 block">Advance (₹)</label>
                      <input
                        id="advancePayment"
                        type="number"
                        value={orderForm.advancePayment}
                        onChange={(e) => setOrderForm({...orderForm, advancePayment: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </>
              )}

              {newOrderStep === 3 && (
                <>
                  <div>
                    <label htmlFor="deliveryDate" className="text-emerald-300 text-sm mb-2 block">Delivery Date</label>
                    <input
                      id="deliveryDate"
                      type="date"
                      value={orderForm.deliveryDate}
                      onChange={(e) => setOrderForm({...orderForm, deliveryDate: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>
                  <div>
                    <label htmlFor="notes" className="text-emerald-300 text-sm mb-2 block">Notes</label>
                    <textarea
                      id="notes"
                      value={orderForm.notes}
                      onChange={(e) => setOrderForm({...orderForm, notes: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      rows={4}
                      placeholder="Special instructions..."
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              {newOrderStep > 1 && (
                <button
                  onClick={() => setNewOrderStep(newOrderStep - 1)}
                  className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-all"
                >
                  Back
                </button>
              )}
              {newOrderStep < 3 ? (
                <button
                  onClick={() => setNewOrderStep(newOrderStep + 1)}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold shadow-lg hover:shadow-emerald-500/50 transition-all"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleCreateOrder}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold shadow-lg hover:shadow-emerald-500/50 transition-all flex items-center justify-center gap-2"
                >
                  <Send size={20} />
                  Create & Notify
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Extend Delivery Date Modal */}
      {showExtendDate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="backdrop-blur-xl bg-slate-900/95 rounded-3xl p-8 max-w-md w-full border border-white/20 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Extend Delivery Date</h2>
              <button
                onClick={() => {
                  setShowExtendDate(null);
                  setNewDeliveryDate('');
                }}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                title="Close"
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-gray-400 text-sm mb-2">Customer</div>
                <div className="text-white font-semibold">{showExtendDate.customer_name}</div>
              </div>

              <div>
                <div className="text-gray-400 text-sm mb-2">Current Delivery Date</div>
                <div className="text-white">{showExtendDate.delivery_date || 'Not set'}</div>
              </div>

              <div>
                <label htmlFor="newDeliveryDate" className="text-emerald-300 text-sm mb-2 block">New Delivery Date *</label>
                <input
                  id="newDeliveryDate"
                  type="date"
                  value={newDeliveryDate}
                  onChange={(e) => setNewDeliveryDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <button
                onClick={handleExtendDeliveryDate}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold shadow-lg hover:shadow-emerald-500/50 transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle size={20} />
                Update & Notify Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {showOrderDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="backdrop-blur-xl bg-slate-900/95 rounded-3xl p-8 max-w-lg w-full border border-white/20 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Order Details</h2>
              <button
                onClick={() => setShowOrderDetail(null)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                title="Close"
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-gray-400 text-sm">Customer</div>
                <div className="text-white text-lg font-semibold">{showOrderDetail.customer_name}</div>
                <div className="text-emerald-300 flex items-center gap-2 mt-1">
                  <Phone size={16} />
                  {showOrderDetail.customer_phone}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-400 text-sm">Items</div>
                  <div className="text-white">{showOrderDetail.items}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Status</div>
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    showOrderDetail.status === 'In Progress' ? 'bg-orange-500/20 text-orange-300' :
                    showOrderDetail.status === 'Ready' ? 'bg-emerald-500/20 text-emerald-300' :
                    'bg-blue-500/20 text-blue-300'
                  }`}>
                    {showOrderDetail.status}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-gray-400 text-sm">Measurements</div>
                <div className="text-white whitespace-pre-line">{showOrderDetail.measurements || 'N/A'}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-400 text-sm">Total Price</div>
                  <div className="text-white font-semibold">₹{showOrderDetail.price}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Advance Paid</div>
                  <div className="text-emerald-300 font-semibold">₹{showOrderDetail.advance_payment}</div>
                </div>
              </div>

              <div>
                <div className="text-gray-400 text-sm">Delivery Date</div>
                <div className="text-white">{showOrderDetail.delivery_date || 'Not set'}</div>
              </div>

              {showOrderDetail.notes && (
                <div>
                  <div className="text-gray-400 text-sm">Notes</div>
                  <div className="text-white">{showOrderDetail.notes}</div>
                </div>
              )}

              <div className="pt-4 border-t border-white/10">
                <div className="text-gray-400 text-sm">Balance Due</div>
                <div className="text-xl font-bold text-emerald-300">
                  ₹{showOrderDetail.price - showOrderDetail.advance_payment}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}