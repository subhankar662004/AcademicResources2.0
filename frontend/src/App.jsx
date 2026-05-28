import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import ScrollToTop from './components/ScrollToTop';
import Header from './components/Header';
import { initServiceWorker } from './utils/pushNotification';
import Footer from './components/Footer';
import Home from './pages/Home';
import Resources from './pages/Resources';
import Upload from './pages/Upload';
import MyAccount from './pages/MyAccount';
import ContactUs from './pages/ContactUs';
import Login from './pages/Login';
import Signup from './pages/Signup';
import GoogleOnboarding from './pages/GoogleOnboarding';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { API_URL } from './config';
import Loader from "./components/Loader";
import BottomBar from './components/BottomBar';
import Test from './pages/Test';
import AIGenerator from './pages/AIGenerator';
import AITestView from "./pages/AITestView";
import ChooseCategory from './pages/ChooseCategory';
import CategoryDashboard from './pages/CategoryDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherHome from './pages/TeacherHome';
import TakeTest from './pages/TakeTest';
import NotFound from './pages/NotFound';

import AdminLayout   from './pages/admin/AdminLayout';
import AdminOverview from './pages/admin/AdminOverview';
import AdminUsers    from './pages/admin/AdminUsers';
import AdminResources from './pages/admin/AdminResources';
import AdminPending  from './pages/admin/AdminPending';
import AdminFolders  from './pages/admin/AdminFolders';
import AdminMessages from './pages/admin/AdminMessages';
import AdminTests    from './pages/admin/AdminTests';
import AdminBroadcast from './pages/admin/AdminBroadcast';
import AdminPublish   from './pages/admin/AdminPublish';
import PublishedTests  from './pages/PublishedTests';
import Notifications  from './pages/Notifications';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function App() {
  const [user,      setUser]      = useState(null);
  const [isAdmin,   setIsAdmin]   = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const login = (userData) => {
    setUser(userData);
    setIsAdmin(userData?.role === 'admin');
    setIsTeacher(userData?.role === 'teacher');
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('isAdmin', userData?.role === 'admin');
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    setIsAdmin(updatedUser?.role === 'admin');
    setIsTeacher(updatedUser?.role === 'teacher');
    localStorage.setItem('user', JSON.stringify(updatedUser));
    localStorage.setItem('isAdmin', updatedUser?.role === 'admin');
  };

  const logout = () => {
    setUser(null);
    setIsAdmin(false);
    setIsTeacher(false);
    localStorage.removeItem('user');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('token');
  };

  // Register the service worker immediately so push messages can be received
  useEffect(() => { initServiceWorker(); }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token      = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        if (token && storedUser) {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          setIsAdmin(parsed?.role === 'admin');
          setIsTeacher(parsed?.role === 'teacher');
        }
      } catch {
        logout();
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (isLoading) return <Loader />;

  const roleHome = isAdmin ? '/admin/overview' : isTeacher ? '/teacher' : '/';

  return (
    <ToastProvider>
      <AuthContext.Provider value={{ user, isAdmin, isTeacher, login, logout, setUser: updateUser }}>
        <Router>
          <div className="app">
            <ScrollToTop />
            <Header />
            <BottomBar />
            <main className="main-content">
              <Routes>
                <Route path="/"          element={isAdmin ? <Navigate to="/admin/overview" /> : isTeacher ? <Navigate to="/teacher" /> : <Home />} />
                <Route path="/resources" element={<Resources />} />
                <Route path="/upload"    element={user ? <Upload />    : <Navigate to="/login" />} />
                <Route path="/my-account" element={user ? <MyAccount /> : <Navigate to="/login" />} />
                <Route path="/contact"   element={<ContactUs />} />
                <Route path="/login"          element={user ? <Navigate to={roleHome}/> : <Login />} />
                <Route path="/signup"         element={user ? <Navigate to={roleHome}/> : <Signup />} />
                <Route path="/forgot-password" element={user ? <Navigate to={roleHome}/> : <ForgotPassword />} />
                <Route path="/reset-password"  element={<ResetPassword />} />
                <Route path="/google-setup"    element={<GoogleOnboarding />} />
                <Route path="/choose-category"   element={user ? <ChooseCategory />     : <Navigate to="/login" />} />
                <Route path="/category-dashboard" element={user ? <CategoryDashboard /> : <Navigate to="/login" />} />
                <Route path="/teacher"       element={(isTeacher || isAdmin) ? <TeacherHome />      : <Navigate to="/" />} />
                <Route path="/teacher/tests" element={(isTeacher || isAdmin) ? <TeacherDashboard /> : <Navigate to="/" />} />
                <Route path="/take-test/:shareCode" element={<TakeTest />} />
                <Route path="/test"      element={user ? <Test />         : <Navigate to="/login" />} />
                <Route path="/ai-generator" element={user ? <AIGenerator /> : <Navigate to="/login" />} />
                <Route path="/ai-test/:id"  element={<AITestView/>} />

                {/* Admin-only pages accessible from main nav */}
                <Route path="/admin/overview"  element={isAdmin ? <AdminLayout><AdminOverview /></AdminLayout>  : <Navigate to="/" />} />
                <Route path="/admin/resources" element={isAdmin ? <AdminLayout><AdminResources /></AdminLayout> : <Navigate to="/" />} />
                <Route path="/admin/pending"   element={isAdmin ? <AdminLayout><AdminPending /></AdminLayout>   : <Navigate to="/" />} />
                <Route path="/admin/folders"   element={isAdmin ? <AdminLayout><AdminFolders /></AdminLayout>   : <Navigate to="/" />} />
                <Route path="/admin/messages"  element={isAdmin ? <AdminLayout><AdminMessages /></AdminLayout>  : <Navigate to="/" />} />

                {/* Admin panel — only Users, Tests, Broadcast, Publish */}
                <Route path="/admin" element={isAdmin ? <AdminLayout /> : <Navigate to="/" />}>
                  <Route index              element={<AdminUsers />} />
                  <Route path="users"       element={<AdminUsers />} />
                  <Route path="tests"       element={<AdminTests />} />
                  <Route path="publish"     element={<AdminPublish />} />
                  <Route path="broadcast"   element={<AdminBroadcast />} />
                </Route>

                <Route path="/official-tests"  element={user ? <PublishedTests />  : <Navigate to="/login" />} />
                <Route path="/notifications"  element={user ? <Notifications />   : <Navigate to="/login" />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </AuthContext.Provider>
    </ToastProvider>
  );
}

export default App;
