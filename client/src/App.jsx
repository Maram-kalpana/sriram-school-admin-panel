import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './admin/AdminLayout.jsx';
import AdminLogin from './admin/pages/AdminLogin.jsx';
import Dashboard from './admin/pages/Dashboard.jsx';
import Students from './admin/pages/Students.jsx';
import Products from './admin/pages/Products.jsx';
import ProductForm from './admin/pages/ProductForm.jsx';
import Inventory from './admin/pages/Inventory.jsx';
import Categories from './admin/pages/Categories.jsx';
import Kit from './admin/pages/Kit.jsx';
import Orders from './admin/pages/Orders.jsx';
import OrderDetail from './admin/pages/OrderDetail.jsx';
import PackingSlip from './admin/pages/PackingSlip.jsx';
import Settings from './admin/pages/Settings.jsx';
import StudentLogin from './store/StudentLogin.jsx';
import Shop from './store/Shop.jsx';
import Cart from './store/Cart.jsx';
import Checkout from './store/Checkout.jsx';
import Confirmation from './store/Confirmation.jsx';
import MyOrders from './store/MyOrders.jsx';
import StoreOrder from './store/StoreOrder.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="students" element={<Students />} />
        <Route path="products" element={<Products />} />
        <Route path="products/new" element={<ProductForm />} />
        <Route path="products/:id" element={<ProductForm />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="categories" element={<Categories />} />
        <Route path="kit" element={<Kit />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="orders/:id/print" element={<PackingSlip />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="/" element={<StudentLogin />} />
      <Route path="/shop" element={<Shop />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/confirmation/:id" element={<Confirmation />} />
      <Route path="/orders" element={<MyOrders />} />
      <Route path="/orders/:id" element={<StoreOrder />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
