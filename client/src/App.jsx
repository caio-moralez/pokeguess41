import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/home";
import Login from "./pages/login";
import Register from "./pages/register";
import DeleteAccount from "./pages/delete";
import Dashboard from "./pages/dashboard";
import Layout from "./layout";
import { AuthProvider } from "./context/authcontext";
import { NotificationProvider } from "./context/notificationContext";
import NotificationList from "./components/notificationList";

export default function App() {
  return (
    <NotificationProvider>
       <NotificationList />
    <AuthProvider>
  
      <Routes>
         <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
       <Route path="/login" element={<Login />} />
       <Route path="/register" element={<Register />} />
       <Route path="/delete" element={<DeleteAccount />} />
       <Route path="/dashboard" element={<Dashboard />} />
       </Route>
      </Routes>
    </AuthProvider>
    </NotificationProvider>
  );
}
