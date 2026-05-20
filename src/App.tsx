import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import RestaurantDetails from './pages/RestaurantDetails';
import Cart from './pages/Cart';
import Orders from './pages/Orders'
import Profile from './pages/Profile';
import Checkout from './pages/Checkout';
import AdminDashboard from './pages/AdminDashboard';
import OrderConfirmation from './pages/Orderconfirmation';
import { AppProvider } from './context/AppContext';
import Chatbot from './components/Chatbot';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/restaurant/:id" element={<RestaurantDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/profile" element={<Profile />} />
        <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/order-confirmation" element={<OrderConfirmation />} />
        </Routes>
        <Chatbot />
      </BrowserRouter>
    </AppProvider>
  );
}