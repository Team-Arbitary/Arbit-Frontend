import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/components/ThemeProvider";
import { User, Mail, Building, Camera, Shield, Palette, Save, RefreshCw, LogOut, Sun, Moon, Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { api, API_ENDPOINTS } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    role: "",
    department: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(API_ENDPOINTS.USER_PROFILE);
        const data = res.data;
        if (data && data.responseData) {
          const user = data.responseData;
          setFormData({
            fullName: user.fullName || "",
            email: user.email || "",
            role: user.role || "",
            department: user.department || "",
          });
        }
      } catch (error) {
        console.error("Failed to fetch user profile", error);
      }
    };
    fetchProfile();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, department: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.put(API_ENDPOINTS.USER_PROFILE, formData);
      toast({
        title: "Profile Updated",
        description: "Your profile information has been updated successfully.",
      });
      // Reload to update Layout header
      window.location.reload();
    } catch (error) {
      console.error("Failed to update profile", error);
      toast({
        title: "Update Failed",
        description: "Failed to update profile information.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout("You have been logged out successfully.");
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const formatRole = (role?: string) => {
    if (!role) return 'User';
    return role.replace('ROLE_', '').charAt(0) + role.replace('ROLE_', '').slice(1).toLowerCase();
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role?.toLowerCase()) {
      case 'role_admin':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'role_engineer':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-green-500/20 text-green-400 border-green-500/30';
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="backdrop-blur-xl bg-card/80 border border-border/50 rounded-2xl p-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and application preferences.
          </p>
        </div>

        <div className="grid gap-6">
          {/* Profile Settings */}
          <Card className="backdrop-blur-xl bg-card/80 border border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Profile Information</CardTitle>
                  <CardDescription>Update your personal details and contact information.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture Section */}
              <div className="flex items-center gap-6 p-4 rounded-xl bg-secondary/30 border border-border/50">
                <Avatar className="h-24 w-24 ring-4 ring-orange-500/20">
                  <AvatarImage src="/user2.jpg" />
                  <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white text-xl font-medium">
                    {getInitials(formData.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-semibold text-lg text-foreground">{formData.fullName || "User"}</h3>
                      <p className="text-sm text-muted-foreground">{formData.email || "No email"}</p>
                    </div>
                    <Badge variant="outline" className={`${getRoleBadgeColor(formData.role)}`}>
                      {formatRole(formData.role)}
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm" className="bg-secondary/50 border-border/50 hover:bg-secondary" disabled>
                    <Camera className="h-4 w-4 mr-2" />
                    Change Photo
                  </Button>
                </div>
              </div>

              <Separator className="bg-border/50" />

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-muted-foreground">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="fullName"
                      placeholder="Full Name"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="pl-10 bg-secondary/50 border-border/50 focus:border-orange-500/50 focus:ring-orange-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-muted-foreground">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Email Address"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="pl-10 bg-secondary/50 border-border/50 focus:border-orange-500/50 focus:ring-orange-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="text-muted-foreground">Role</Label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="role"
                      placeholder="Role"
                      value={formatRole(formData.role)}
                      disabled
                      className="pl-10 bg-secondary/30 border-border/50 text-muted-foreground cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Role is managed by administrators.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department" className="text-muted-foreground">Department</Label>
                  <Select value={formData.department} onValueChange={handleSelectChange}>
                    <SelectTrigger className="bg-secondary/50 border-border/50 focus:border-orange-500/50">
                      <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="bg-card/95 backdrop-blur-xl border-border/50">
                      <SelectItem value="Inspection">Inspection</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Management">Management</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={handleSubmit} 
                  disabled={loading}
                  className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                  className="bg-secondary/50 border-border/50 hover:bg-secondary"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Theme Settings */}
          <Card className="backdrop-blur-xl bg-card/80 border border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <Palette className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Appearance</CardTitle>
                  <CardDescription>Customize how the application looks on your device.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label className="text-muted-foreground">Theme</Label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: "light", label: "Light", icon: Sun },
                    { value: "dark", label: "Dark", icon: Moon },
                    { value: "system", label: "System", icon: Monitor },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTheme(option.value)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        theme === option.value
                          ? "border-orange-500 bg-orange-500/10"
                          : "border-border/50 bg-secondary/30 hover:border-border hover:bg-secondary/50"
                      }`}
                    >
                      <option.icon className={`h-6 w-6 mx-auto mb-2 ${
                        theme === option.value ? "text-orange-500" : "text-muted-foreground"
                      }`} />
                      <div className={`text-sm font-medium ${
                        theme === option.value ? "text-orange-500" : "text-foreground"
                      }`}>
                        {option.label}
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Choose your preferred theme or let the app follow your system settings.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card className="backdrop-blur-xl bg-card/80 border border-red-500/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <LogOut className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Account Actions</CardTitle>
                  <CardDescription>Sign out of your account or manage session settings.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                <div>
                  <h4 className="font-medium text-foreground">Sign Out</h4>
                  <p className="text-sm text-muted-foreground">End your current session and return to the login page.</p>
                </div>
                <Button 
                  variant="destructive"
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
