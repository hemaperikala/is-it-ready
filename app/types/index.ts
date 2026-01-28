export interface Order {
  id: string;
  shop_id: string;
  customer_name: string;
  customer_phone: string;
  items: string;
  measurements: string;
  price: number;
  advance_payment: number;
  delivery_date: string;
  notes: string;
  status: 'In Progress' | 'Ready' | 'Completed';
  created_at: string;
}

export interface OrderForm {
  customerName: string;
  customerPhone: string;
  items: string;
  measurements: string;
  price: string;
  advancePayment: string;
  deliveryDate: string;
  notes: string;
}

export interface Stats {
  inProgress: number;
  ready: number;
  completed: number;
}