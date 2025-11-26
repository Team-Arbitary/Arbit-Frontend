import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { api, API_ENDPOINTS } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Eye, EyeOff, Loader2, AlertCircle, Zap, User, Lock, ArrowRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import Ballpit from "@/components/ui/Ballpit";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logoutMessage, setLogoutMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, isAuthenticated } = useAuth();

  // Check for logout message on mount
  useEffect(() => {
    const message = sessionStorage.getItem("logoutMessage");
    if (message) {
      setLogoutMessage(message);
      sessionStorage.removeItem("logoutMessage");
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleGoogleLogin = () => {
    toast({
      title: "Google Sign-In",
      description: "Google authentication is under development. Please use your credentials to sign in.",
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLogoutMessage(null);
    
    try {
      const response = await api.post(API_ENDPOINTS.USER_LOGIN, { username, password });
      
      if (response.data.jwt) {
        login(response.data.jwt);
        toast({
          title: "Welcome back!",
          description: "Login successful. Redirecting to dashboard...",
        });
        navigate("/");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || "Invalid username or password";
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-black relative overflow-hidden">
      {/* Ballpit Background Effect */}
      <div className="absolute inset-0 z-0" style={{ width: '100%', height: '100%' }}>
        <Ballpit
          count={100}
          gravity={0}
          friction={0.99}
          wallBounce={0.95}
          followCursor={true}
          colors={[0xf97316, 0xea580c, 0xfb923c, 0xfdba74, 0xfed7aa]}
          ambientColor={0x222222}
          ambientIntensity={0.8}
          lightIntensity={200}
          minSize={0.5}
          maxSize={1.0}
          size0={1.5}
          maxVelocity={0.15}
          materialParams={{
            metalness: 0.7,
            roughness: 0.2,
            clearcoat: 1,
            clearcoatRoughness: 0.1
          }}
        />
      </div>
      
      {/* Dark overlay for better readability */}
      <div className="absolute inset-0 bg-black/40 z-[1]" />

      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10">
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent z-[2]" />
        
        <div className="relative z-10 flex flex-col justify-center px-16 py-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl shadow-orange-500/30 backdrop-blur-sm">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold text-white">Arbit</span>
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Transformer Thermal<br />Analytics Platform
          </h1>
          <p className="text-lg text-white/70 mb-8 max-w-md">
            Advanced thermal imaging analysis for predictive maintenance and anomaly detection in power transformers.
          </p>
          
          <div className="space-y-4">
            {[
              { title: "Real-time Analysis", desc: "Instant thermal anomaly detection" },
              { title: "Predictive Insights", desc: "AI-powered maintenance forecasting" },
              { title: "Comprehensive Reports", desc: "Detailed inspection documentation" },
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-3 backdrop-blur-sm bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="w-6 h-6 rounded-full bg-orange-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                </div>
                <div>
                  <h3 className="text-white font-medium">{feature.title}</h3>
                  <p className="text-sm text-white/60">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <Card className="w-full max-w-md backdrop-blur-2xl bg-black/60 border-white/10 shadow-2xl shadow-orange-500/10">
          <CardHeader className="space-y-2 pb-4">
            {/* Mobile Logo */}
            <div className="flex items-center gap-3 lg:hidden mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Arbit</span>
            </div>
            
            <CardTitle className="text-2xl font-bold text-white">
              Welcome back
            </CardTitle>
            <CardDescription className="text-white/60">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>

          {logoutMessage && (
            <div className="px-6 pb-2">
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{logoutMessage}</AlertDescription>
              </Alert>
            </div>
          )}

          <CardContent className="space-y-5">
            {/* Google Login Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full bg-white hover:bg-gray-100 text-slate-900 border-white/20 h-11 font-medium"
              onClick={handleGoogleLogin}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </Button>

            <div className="relative">
              <Separator className="bg-white/10" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 backdrop-blur-sm px-3 text-xs text-white/50">
                or continue with
              </span>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-white/70 text-sm">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    id="username"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-10 bg-white/5 border-white/10 focus:border-orange-500 focus:ring-orange-500/20 text-white placeholder:text-white/30 h-11 backdrop-blur-sm"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-white/70 text-sm">Password</Label>
                  <button type="button" className="text-xs text-orange-500 hover:text-orange-400 transition-colors">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-10 pr-10 bg-white/5 border-white/10 focus:border-orange-500 focus:ring-orange-500/20 text-white placeholder:text-white/30 h-11 backdrop-blur-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-white/40 hover:text-white"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button
                className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-medium shadow-lg shadow-orange-500/30 h-11 mt-2"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          
          <CardFooter className="pt-2">
            <p className="text-sm text-white/50 text-center w-full">
              Don't have an account?{" "}
              <Link to="/signup" className="text-orange-500 hover:text-orange-400 font-medium transition-colors">
                Create account
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Login;
