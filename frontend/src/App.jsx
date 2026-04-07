import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '@/components/common/ProtectedRoute'
import DashboardLayout from '@/components/layout/DashboardLayout'
import LoginPage from '@/pages/LoginPage'
import OAuthCallback from '@/pages/OAuthCallback'
import DashboardPage from '@/pages/DashboardPage'
import ResourcesPage from '@/pages/resources/ResourcesPage'
import BookingsPage from '@/pages/BookingsPage'
import TicketsPage from '@/pages/TicketsPage'
import MyTickets from '@/pages/tickets/MyTickets'
import CreateTicket from '@/pages/tickets/CreateTicket'
import TicketDetails from '@/pages/tickets/TicketDetails'
import NotificationsPage from '@/pages/NotificationsPage'
import UserManagementPage from '@/pages/UserManagementPage'

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />

      {/* Protected */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/resources" element={<ResourcesPage />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/tickets/my" element={<MyTickets />} />
        <Route path="/tickets/create" element={<CreateTicket />} />
        <Route path="/tickets/:id" element={<TicketDetails />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/admin/users" element={<UserManagementPage />} />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}