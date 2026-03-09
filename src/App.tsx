import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import OverviewPage from "./pages/dashboard/OverviewPage";
import WalletPage from "./pages/dashboard/WalletPage";
import BrowseProjectsPage from "./pages/dashboard/BrowseProjectsPage";
import CreateProjectPage from "./pages/dashboard/CreateProjectPage";
import ProjectDetailPage from "./pages/dashboard/ProjectDetailPage";
import MyProjectsPage from "./pages/dashboard/MyProjectsPage";
import KanbanPage from "./pages/dashboard/KanbanPage";
import ProfilePage from "./pages/dashboard/ProfilePage";
import AdminPage from "./pages/admin/AdminPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout>
                <OverviewPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/dashboard/wallet" element={
            <ProtectedRoute>
              <DashboardLayout>
                <WalletPage />
              </DashboardLayout>
            </ProtectedRoute>
          }/>
          <Route path="/dashboard/projects/create" element={
            <ProtectedRoute>
              <DashboardLayout>
                <CreateProjectPage />
              </DashboardLayout>
            </ProtectedRoute>
          }/>
          <Route path="/dashboard/projects/:id/kanban" element={
            <ProtectedRoute>
              <DashboardLayout>
                <KanbanPage />
              </DashboardLayout>
            </ProtectedRoute>
          }/>
          <Route path="/dashboard/projects/:id" element={
            <ProtectedRoute>
              <DashboardLayout>
                <ProjectDetailPage />
              </DashboardLayout>
            </ProtectedRoute>
          }/>
          <Route path="/dashboard/projects" element={
            <ProtectedRoute>
              <DashboardLayout>
                <BrowseProjectsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }/>
          <Route path="/dashboard/my-projects" element={
            <ProtectedRoute>
              <DashboardLayout>
                <MyProjectsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }/>
          <Route path="/dashboard/profile" element={
            <ProtectedRoute>
              <DashboardLayout>
                <ProfilePage />
              </DashboardLayout>
            </ProtectedRoute>
          }/>
          <Route path="/admin" element={
            <ProtectedRoute>
              <DashboardLayout>
                <AdminPage />
              </DashboardLayout>
            </ProtectedRoute>
          }/>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}