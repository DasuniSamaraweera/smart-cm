import { useNavigate } from 'react-router-dom'
import { GraduationCap, BookOpen, Users, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { API_BASE_URL_RAW } from '@/api/axios'

export default function LoginPage() {
  const handleGoogleSignIn = () => {
    window.location.href = `${API_BASE_URL_RAW}/login/oauth2/authorization/google`
  }

  const features = [
    {
      icon: BookOpen,
      title: 'Resource Booking',
      description: 'Manage campus resources and facilities'
    },
    {
      icon: Users,
      title: 'Support Ticketing',
      description: 'Track and resolve support requests'
    },
    {
      icon: Zap,
      title: 'Smart Notifications',
      description: 'Stay updated with real-time alerts'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-2000"></div>
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 py-12 relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Side - Branding & Features */}
          <div className="hidden md:flex flex-col justify-center space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg">
                  <GraduationCap className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Smart Campus</h1>
                  <p className="text-blue-600 text-sm">Operations Hub</p>
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-4xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  Manage bookings, support, and campus operations from one place.
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-lg">
                  Smart Campus brings together resource reservations, support workflows, and real-time notifications into one modern platform for students, staff, and administrators.
                </p>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-4">
              {features.map((feature, idx) => {
                const Icon = feature.icon
                return (
                  <div key={idx} className="flex gap-4 group">
                    <div className="flex-shrink-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-200 transition-colors">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">{feature.title}</h3>
                      <p className="text-slate-600 dark:text-slate-400 text-sm">{feature.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Side - Sign In Form */}
          <div className="flex flex-col items-center justify-center">
            <Card className="w-full max-w-md shadow-2xl border-0 bg-white dark:bg-gray-900/95 backdrop-blur-sm">
              <CardHeader className="space-y-2 pb-6">
                <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
                <CardDescription className="text-center text-base">
                  Sign in with your university Google account to access Smart Campus
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Google Sign In Button */}
                <Button 
                  onClick={handleGoogleSignIn} 
                  className="w-full h-12 gap-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </Button>

                {/* Footer Text */}
                <div className="space-y-2 pt-2">
                  <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                    By signing in, you agree to our campus usage policies and terms of service.
                  </p>
                  <p className="text-xs text-center text-gray-400 dark:text-gray-500">
                    Need help? <span className="text-blue-600 font-medium cursor-pointer hover:text-blue-700">Contact IT support</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Mobile Brand Info */}
            <div className="md:hidden text-center mt-8">
              <p className="text-blue-600 text-sm">Smart Campus • Operations Hub</p>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Animation Delay */}
      <style>{`
        @keyframes pulse-delayed {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.3; }
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  )
}
