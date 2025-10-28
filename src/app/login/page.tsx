
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Lock, Mail, FileHeart } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { initiateEmailSignIn, initiateEmailSignUp } from '@/firebase/non-blocking-login';
import { useToast } from '@/hooks/use-toast';
import { Auth } from 'firebase/auth';
import Link from 'next/link';
import './style.css';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

const registerSchema = z.object({
  username: z.string().min(1, 'Username is required.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;


export default function LoginPage() {
  const [isActive, setIsActive] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { auth } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', email: '', password: '' },
  });

  const onLoginSubmit = async (values: LoginFormValues) => {
    if (!auth) return;
    setIsLoggingIn(true);
    try {
      await initiateEmailSignIn(auth as Auth, values.email, values.password);
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Login failed:", error);
      toast({
        title: 'Login Failed',
        description: "Please check your email and password. If the problem persists, it may be a network issue.",
        variant: 'destructive',
      });
      setIsLoggingIn(false);
    }
  };

  const onRegisterSubmit = async (values: RegisterFormValues) => {
    if (!auth) return;
    setIsLoggingIn(true);
    try {
      await initiateEmailSignUp(auth as Auth, values.email, values.password, values.username);
      router.push('/dashboard');
    } catch (error: any) {
       console.error("Registration failed:", error);
      toast({
        title: 'Registration Failed',
        description: error.message || 'An unexpected error occurred during registration.',
        variant: 'destructive',
      });
      setIsLoggingIn(false);
    }
  };
  
  if (isLoggingIn) {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background text-foreground animate-fade-in">
            <div className="relative flex justify-center items-center">
                <div className="absolute h-24 w-24 rounded-full border-t-4 border-b-4 border-primary animate-spin"></div>
                <FileHeart className="w-16 h-16 text-primary" />
            </div>
            <p className="text-lg font-semibold text-muted-foreground mt-8">Securely logging you in...</p>
            <p className="text-sm text-muted-foreground/80">Please wait a moment.</p>
        </div>
    );
  }

  return (
    <div className='login-body'>
      <div className={cn('container', isActive && 'active')}>
        <header className="absolute top-0 left-0 right-0 py-4 px-4 sm:px-6 lg:px-8 z-10 flex justify-center items-center">
            <Link href="/" className='flex items-center gap-3'>
                <FileHeart className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-headline font-bold text-primary">
                   MediScan AI
               </h1>
           </Link>
        </header>

        <div className="curved-shape"></div>
        <div className="curved-shape2"></div>

        <div className="form-box Login">
          <h2 className="animation" style={{ '--D': 0, '--S': 21 } as React.CSSProperties}>Login</h2>
          <form onSubmit={loginForm.handleSubmit(onLoginSubmit)}>
            <div className="input-box animation" style={{ '--D': 1, '--S': 22 } as React.CSSProperties}>
              <input type="email" {...loginForm.register('email')} required placeholder=" " />
              <label>Email</label>
              <Mail className="text-foreground/70" />
            </div>
             {loginForm.formState.errors.email && <p className="error-message">{loginForm.formState.errors.email.message}</p>}
            <div className="input-box animation" style={{ '--D': 2, '--S': 23 } as React.CSSProperties}>
              <input type="password" {...loginForm.register('password')} required placeholder=" " />
              <label>Password</label>
              <Lock className="text-foreground/70" />
            </div>
            {loginForm.formState.errors.password && <p className="error-message">{loginForm.formState.errors.password.message}</p>}
            <div className="input-box animation" style={{ '--D': 3, '--S': 24 } as React.CSSProperties}>
              <button className="btn" type="submit">Login</button>
            </div>
            <div className="regi-link animation" style={{ '--D': 4, '--S': 25 } as React.CSSProperties}>
              <p>Don't have an account? <br /> <a href="#" className="SignUpLink" onClick={(e) => { e.preventDefault(); setIsActive(true); }}>Sign Up</a></p>
            </div>
          </form>
        </div>

        <div className="info-content Login">
          <h2 className="animation" style={{ '--D': 0, '--S': 20 } as React.CSSProperties}>WELCOME BACK!</h2>
          <p className="animation" style={{ '--D': 1, '--S': 21 } as React.CSSProperties}>We are happy to have you with us again. If you need anything, we are here to help.</p>
        </div>

        <div className="form-box Register">
          <h2 className="animation" style={{ '--li': 17, '--S': 0 } as React.CSSProperties}>Register</h2>
          <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)}>
            <div className="input-box animation" style={{ '--li': 18, '--S': 1 } as React.CSSProperties}>
              <input type="text" {...registerForm.register('username')} required placeholder=" " />
              <label>Username</label>
              <User className="text-foreground/70" />
            </div>
            {registerForm.formState.errors.username && <p className="error-message">{registerForm.formState.errors.username.message}</p>}
            <div className="input-box animation" style={{ '--li': 19, '--S': 2 } as React.CSSProperties}>
              <input type="email" {...registerForm.register('email')} required placeholder=" " />
              <label>Email</label>
              <Mail className="text-foreground/70" />
            </div>
            {registerForm.formState.errors.email && <p className="error-message">{registerForm.formState.errors.email.message}</p>}
            <div className="input-box animation" style={{ '--li': 19, '--S': 3 } as React.CSSProperties}>
              <input type="password" {...registerForm.register('password')} required placeholder=" " />
              <label>Password</label>
              <Lock className="text-foreground/70" />
            </div>
            {registerForm.formState.errors.password && <p className="error-message">{registerForm.formState.errors.password.message}</p>}
            <div className="input-box animation" style={{ '--li': 20, '--S': 4 } as React.CSSProperties}>
              <button className="btn" type="submit">Register</button>
            </div>
            <div className="regi-link animation" style={{ '--li': 21, '--S': 5 } as React.CSSProperties}>
              <p>Already have an account? <br /> <a href="#" className="SignInLink" onClick={(e) => { e.preventDefault(); setIsActive(false); }}>Sign In</a></p>
            </div>
          </form>
        </div>

        <div className="info-content Register">
          <h2 className="animation" style={{ '--li': 17, '--S': 0 } as React.CSSProperties}>WELCOME!</h2>
          <p className="animation" style={{ '--li': 18, '--S': 1 } as React.CSSProperties}>We’re delighted to have you here. If you need any assistance, feel free to reach out.</p>
        </div>
      </div>
    </div>
  );
}
