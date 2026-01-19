import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useReferralProcessor } from "@/hooks/useReferralProcessor";
import Navbar from "@/components/Navbar";
import RouteGuard from "@/components/RouteGuard";
import ProfileCompletionGuard from "@/components/ProfileCompletionGuard";
import Index from "./pages/Index";
import Downloads from "./pages/Downloads";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import AdminBlog from "./pages/AdminBlog";
import AdminBlogCategories from "./pages/BlogCategoriesPage";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CreateAccount from "./pages/CreateAccount";
import VerificationCenter from "./pages/VerificationCenter";
import MetaTraderAccounts from "./pages/MetaTraderAccounts";
import OverseasCompany from "./pages/OverseasCompany";
import Referrals from "./pages/Referrals";
import Profile from "./pages/Profile";
import Requests from "./pages/Requests";
import ChangePassword from "./pages/ChangePassword";
import ForgotPassword from "./pages/ForgotPassword";
import ForgotUsername from "./pages/ForgotUsername";
import ResetPassword from "./pages/ResetPassword";
import TradingDashboard from "./pages/TradingDashboard";
import Contact from "./pages/Contact";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
// Admin imports
import AdminRouteGuard from "./components/admin/AdminRouteGuard";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAccounts from "./pages/admin/AdminAccounts";
import AdminOverseasCompanies from "./pages/admin/AdminOverseasCompanies";
import AdminReferrals from "./pages/admin/AdminReferrals";
import AdminContactRequests from "./pages/admin/AdminContactRequests";
import AdminEmail from "./pages/admin/AdminEmail";
import AdminRequests from "./pages/admin/AdminRequests";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminAuditLog from "./pages/admin/AdminAuditLog";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminEmailTest from "./pages/admin/AdminEmailTest";
import AdminPrayerTasks from "./pages/admin/AdminPrayerTasks";
import CreateAdminUser from "./pages/CreateAdminUser";
import PrayerTasks from "./pages/PrayerTasks";
import ScrollToTop from './ScrollToTop';
import IntroManager from '@/components/IntroManager';
import { isIntroCompleted } from '@/utils/intro';

const queryClient = new QueryClient();

function AppContent() {
  useReferralProcessor(); // Process any pending referrals

  return (
    <RouteGuard>
      <ScrollToTop />
      <div className="min-h-screen w-full">
        <Navbar />
        <ProfileCompletionGuard>
          <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/downloads" element={<Downloads />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/create-account" element={<CreateAccount />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/verification" element={<VerificationCenter />} />
                  <Route path="/meta-trader-accounts" element={<MetaTraderAccounts />} />
                  <Route path="/overseas-company" element={<OverseasCompany />} />
                  <Route path="/referrals" element={<Referrals />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/requests" element={<Requests />} />
                  <Route path="/change-password" element={<ChangePassword />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/forgot-username" element={<ForgotUsername />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/trading" element={<TradingDashboard />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/prayer-tasks" element={<PrayerTasks />} />
                  <Route path="/create-admin" element={<CreateAdminUser />} />
                   
                   {/* Admin Routes */}
                  <Route path="/admin" element={
                    <AdminRouteGuard>
                      <AdminLayout>
                        <AdminDashboard />
                      </AdminLayout>
                    </AdminRouteGuard>
                  } />
                  <Route path="/admin/dashboard" element={
                    <AdminRouteGuard>
                      <AdminLayout>
                        <AdminDashboard />
                      </AdminLayout>
                    </AdminRouteGuard>
                  } />
                  <Route path="/admin/users" element={
                    <AdminRouteGuard>
                      <AdminLayout>
                        <AdminUsers />
                      </AdminLayout>
                    </AdminRouteGuard>
                  } />
                  <Route path="/admin/accounts" element={
                    <AdminRouteGuard>
                      <AdminLayout>
                        <AdminAccounts />
                      </AdminLayout>
                    </AdminRouteGuard>
                  } />
                  <Route path="/admin/overseas-companies" element={
                    <AdminRouteGuard>
                      <AdminLayout>
                        <AdminOverseasCompanies />
                      </AdminLayout>
                    </AdminRouteGuard>
                  } />
                  <Route path="/admin/referrals" element={
                    <AdminRouteGuard>
                      <AdminLayout>
                        <AdminReferrals />
                      </AdminLayout>
                    </AdminRouteGuard>
                  } />
                  <Route path="/admin/contact-requests" element={
                    <AdminRouteGuard>
                      <AdminLayout>
                        <AdminContactRequests />
                      </AdminLayout>
                    </AdminRouteGuard>
                  } />
                  <Route path="/admin/email" element={
                    <AdminRouteGuard>
                      <AdminLayout>
                        <AdminEmail />
                      </AdminLayout>
                    </AdminRouteGuard>
                  } />
                  <Route path="/admin/deposit-withdrawal-request" element={
                    <AdminRouteGuard>
                      <AdminLayout>
                        <AdminRequests />
                      </AdminLayout>
                    </AdminRouteGuard>
                  } />
                  <Route path="/admin/analytics" element={
                    <AdminRouteGuard>
                      <AdminLayout>
                        <AdminAnalytics />
                      </AdminLayout>
                    </AdminRouteGuard>
                  } />
                  <Route path="/admin/audit-log" element={
                    <AdminRouteGuard>
                      <AdminLayout>
                        <AdminAuditLog />
                      </AdminLayout>
                    </AdminRouteGuard>
                  } />
                  <Route path="/admin/blog" element={
                    <AdminRouteGuard>
                      <AdminLayout>
                        <AdminBlog />
                      </AdminLayout>
                    </AdminRouteGuard>
                  } />
                    <Route
                      path="/admin/blog-categories"
                      element={
                        <AdminRouteGuard>
                          <AdminLayout>
                            <AdminBlogCategories />
                          </AdminLayout>
                        </AdminRouteGuard>
                      }
                    />
                    <Route path="/admin/settings" element={
                      <AdminRouteGuard>
                        <AdminLayout>
                          <AdminSettings />
                        </AdminLayout>
                      </AdminRouteGuard>
                    } />
                    <Route path="/admin/email-test" element={
                      <AdminRouteGuard>
                        <AdminLayout>
                          <AdminEmailTest />
                        </AdminLayout>
                      </AdminRouteGuard>
                    } />
                    <Route path="/admin/prayer-tasks" element={
                      <AdminRouteGuard> 
                        <AdminLayout>
                          <AdminPrayerTasks />
                        </AdminLayout>
                      </AdminRouteGuard>
                    } />


                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
          </ProfileCompletionGuard>
        </div>
      </RouteGuard>
  );
}

function App() {
  const [isIntroGateBlocking, setIsIntroGateBlocking] = React.useState(() => {
    // Prevent any app UI from mounting on first visit (home route)
    // until the intro gate completes.
    try {
      return !isIntroCompleted();
    } catch {
      return false;
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
            <IntroManager onGateBlockingChange={setIsIntroGateBlocking} />
            {!isIntroGateBlocking && <AppContent />}
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
