import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const hero = "/auth-hero.jpg";

import { GrowMateMascot } from "@/components/GrowMateMascot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  containerVariants,
  imageVariants,
  itemVariants,
  WelcomeScreen,
} from "@/components/ui/onboarding-welcome-screen";
import { useAuth } from "@/contexts/AuthContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Link, useNavigate } from "@/lib/router-compat";

const GoogleIcon = () => (
  <svg className="h-5 w-5 mr-2 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

const Title = () => (
  <>
    Welcome to <span className="bg-clip-text text-transparent gradient-primary">Anonna Mart</span>
  </>
);
const DESC =
  "Run your entire store from one place — orders, products, customers, couriers and tracking.";

const AuthPage = () => {
  useDocumentTitle("Admin Sign In · Anonna Mart");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const { user, signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/admin", { replace: true });
  }, [user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = (await signIn(email, password)) || ({} as any);
    setLoading(false);
    if (error) toast.error(error.message || "Sign in failed");
    else navigate("/admin", { replace: true });
  };

  const onGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) {
      toast.error(error.message || "Google sign in failed");
    }
  };

  const form = (
    <motion.form
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      onSubmit={onSubmit}
      className="w-full space-y-4"
    >
      <motion.div variants={itemVariants}>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12 w-full rounded-xl border border-border/80 bg-background hover:bg-muted/50 font-medium"
          onClick={onGoogleSignIn}
          disabled={googleLoading || loading}
        >
          {googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
          Continue with Google
        </Button>
      </motion.div>

      <motion.div variants={itemVariants} className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/60" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or with email</span>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="admin@store.com"
            className="h-12 rounded-xl pl-9"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="h-12 rounded-xl pl-9 pr-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Button
          type="submit"
          size="lg"
          className="h-12 w-full border-0 gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
          disabled={loading || googleLoading}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Sign in with Email
        </Button>
      </motion.div>
    </motion.form>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile / tablet: onboarding flow */}
      <div className="mx-auto min-h-screen max-w-md lg:hidden">
        <AnimatePresence mode="wait">
          {!showForm ? (
            <motion.div key="welcome" exit={{ opacity: 0, x: -30 }} className="min-h-screen">
              <WelcomeScreen
                className="min-h-screen"
                imageUrl={typeof hero === "string" ? hero : (hero as any)?.src || "/auth-hero.jpg"}
                title={<Title />}
                description={DESC}
                buttonText="Sign in to admin"
                onButtonClick={() => setShowForm(true)}
                secondaryActionText={
                  <>
                    Need help? <span className="font-semibold text-primary">Reset password</span>
                  </>
                }
                onSecondaryActionClick={() => navigate("/forgot-password")}
              >
                <motion.div variants={itemVariants}>
                  <GrowMateMascot className="h-32 w-32" />
                </motion.div>
              </WelcomeScreen>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex min-h-screen flex-col px-6 py-8"
            >
              <button
                onClick={() => setShowForm(false)}
                className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <GrowMateMascot className="h-28 w-28" />
              <h1 className="mt-2 text-center font-display text-2xl font-bold">Admin sign in</h1>
              <p className="mb-8 mt-1 text-center text-sm text-muted-foreground">
                Enter your credentials or use Google to continue.
              </p>
              {form}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop: curved showcase + form */}
      <div className="hidden min-h-screen lg:grid lg:grid-cols-2">
        <div className="flex flex-col bg-secondary/40">
          <motion.div initial="hidden" animate="visible" variants={imageVariants}>
            <img
              src={typeof hero === "string" ? hero : (hero as any)?.src || "/auth-hero.jpg"}
              alt="Anonna Mart store tools"
              width={1280}
              height={1024}
              className="h-auto w-full object-cover"
              style={{ clipPath: "ellipse(100% 60% at 50% 40%)" }}
            />
          </motion.div>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="flex flex-1 flex-col items-center justify-center space-y-4 px-12 pb-10 text-center"
          >
            <motion.h2
              variants={itemVariants}
              className="font-display text-4xl font-bold tracking-tight"
            >
              <Title />
            </motion.h2>
            <motion.p variants={itemVariants} className="max-w-md text-muted-foreground">
              {DESC}
            </motion.p>
          </motion.div>
        </div>
        <div className="flex items-center justify-center px-6 py-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="w-full max-w-sm"
          >
            <motion.div variants={itemVariants}>
              <GrowMateMascot className="h-40 w-40" />
            </motion.div>
            <motion.h1
              variants={itemVariants}
              className="mt-2 text-center font-display text-3xl font-bold"
            >
              Admin sign in
            </motion.h1>
            <motion.p
              variants={itemVariants}
              className="mb-8 mt-2 text-center text-muted-foreground"
            >
              Sign in to your master admin panel.
            </motion.p>
            {form}
            <motion.p
              variants={itemVariants}
              className="mt-8 text-center text-xs text-muted-foreground"
            >
              Powered by <span className="font-semibold text-foreground">Anonna Mart</span> · Your
              Growth Partner
            </motion.p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
