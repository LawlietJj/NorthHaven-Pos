import { Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./layouts/AppLayout";
import OwnerDashboard from "./pages/OwnerDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import POS from "./pages/POS";
import Products from "./pages/Products";
import LoginUser from "./pages/LoginUser";
import ProductForm from "./pages/ProductForm";
import Users from "./pages/Users";
import Categories from "./pages/Categories";
import Sales from "./pages/Sales";
import ProtectedRoutes from "./components/protectedRoutes";
import Shops from "./pages/shops";

function App() {
  return (
    <div className="min-h-screen w-full overscroll-none">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginUser />} />

          <Route
            path="/owner-dashboard"
            element={
              <ProtectedRoutes allowedRoles={["owner"]}>
                <AppLayout title="Dashboard">
                  <OwnerDashboard />
                </AppLayout>
              </ProtectedRoutes>
            }
          />

          <Route
            path="/manager-dashboard"
            element={
              <ProtectedRoutes allowedRoles={["manager"]}>
                <AppLayout title="Dashboard">
                  <ManagerDashboard />
                </AppLayout>
              </ProtectedRoutes>
            }
          />

          <Route
            path="/pos"
            element={
              <ProtectedRoutes allowedRoles={["owner", "manager", "cashier"]}>
                <AppLayout title="Point of Sale">
                  <POS />
                </AppLayout>
              </ProtectedRoutes>
            }
          />

          <Route
            path="/products"
            element={
                <ProtectedRoutes allowedRoles={["owner"]}>
                <AppLayout title="Products">
                  <Products />
                </AppLayout>
              </ProtectedRoutes>
            }
          />
          <Route
            path="/products/new"
            element={
              <ProtectedRoutes allowedRoles={["owner", "manager"]}>
                <AppLayout title="Add Product">
                  <ProductForm mode="create" />
                </AppLayout>
              </ProtectedRoutes>
            }
          />
          <Route
            path="/products/:id"
            element={
              <ProtectedRoutes allowedRoles={["owner", "manager"]}>
                <AppLayout title="Edit Product">
                  <ProductForm />
                </AppLayout>
              </ProtectedRoutes>
            }
          />

          <Route
            path="/categories"
            element={
              <ProtectedRoutes allowedRoles={["owner", "manager"]}>
                <AppLayout title="Categories">
                  <Categories />
                </AppLayout>
              </ProtectedRoutes>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedRoutes allowedRoles={["owner"]}>
                <AppLayout title="Users">
                  <Users />
                </AppLayout>
              </ProtectedRoutes>
            }
          />

          <Route
            path="/sales"
            element={
              <ProtectedRoutes allowedRoles={["owner", "manager", "cashier"]}>
                <AppLayout title="Sales">
                  <Sales />
                </AppLayout>
              </ProtectedRoutes>
            }
          />

          <Route
            path="/shops"
            element={
              <ProtectedRoutes allowedRoles={["owner"]}>
                <AppLayout title="Shops">
                  <Shops />
                </AppLayout>
              </ProtectedRoutes>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </div>
  );
}

export default App;