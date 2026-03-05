import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { setAuthData } from "@/lib/auth";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("ChangeMe123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Login failed");
        return;
      }
      setAuthData(data.token, data.user);
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err.message || "Connection error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Materials OS</h1>
        <p className="text-slate-500">Ticketing System</p>
      </div>
      <Card className="w-full max-w-md shadow-lg border-slate-200">
        <form onSubmit={handleLogin}>
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold text-center">Sign in</CardTitle>
            <CardDescription className="text-center">Enter your email and password to access your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 border border-red-200 rounded-md px-4 py-3 text-sm" data-testid="text-login-error">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} data-testid="input-email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} data-testid="input-password" required />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full h-11 text-base" disabled={loading} data-testid="button-submit">
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
