'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, ArrowRight, Github, Chrome, Lock, Mail } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate login delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    window.location.href = '/';
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-zinc-950 overflow-hidden select-none">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:32px_32px]" />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes container-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-container { animation: container-in 0.8s cubic-bezier(0.2, 0, 0, 1) forwards; }
        .animate-float { animation: float 6s ease-in-out infinite; }
      `}} />

      <div className="animate-container relative z-10 w-full max-w-[420px] px-6">
        {/* Branding */}
        <div className="text-center mb-10">
          <div className="animate-float inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl mb-6 relative group">
            <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <ShieldCheck className="h-8 w-8 text-emerald-500 relative z-10" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">
            Hatch AI <span className="text-zinc-500">Veracity</span>
          </h1>
          <p className="text-sm font-medium text-zinc-500 tracking-wide uppercase">
            Internal Agentic Protocol
          </p>
        </div>

        {/* Login Card */}
        <div className="backdrop-blur-xl bg-zinc-900/60 border border-white/10 rounded-3xl p-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 ml-1">
                Access Identifier
              </Label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Mail className="h-4 w-4 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
                </div>
                <Input 
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  required
                  className="bg-black/20 border-white/5 h-11 pl-10 text-zinc-200 placeholder:text-zinc-700 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50 rounded-xl transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <Label htmlFor="password" className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                  Security Token
                </Label>
                <Link href="#" className="text-[10px] font-bold text-zinc-600 hover:text-emerald-500 transition-colors">
                  FORGOT?
                </Link>
              </div>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Lock className="h-4 w-4 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
                </div>
                <Input 
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  className="bg-black/20 border-white/5 h-11 pl-10 text-zinc-200 placeholder:text-zinc-700 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50 rounded-xl transition-all"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all duration-300 group"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  <span>INITIALIZING...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>INITIALIZE SESSION</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600">
              <span className="bg-[#0e0e11] px-4">Federated Auth</span>
            </div>
          </div>

          {/* Social Logins */}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-11 bg-white/5 border-white/5 hover:bg-white/10 text-zinc-400 font-bold rounded-xl transition-all gap-2">
              <Chrome className="h-4 w-4" />
              GOOGLE
            </Button>
            <Button variant="outline" className="h-11 bg-white/5 border-white/5 hover:bg-white/10 text-zinc-400 font-bold rounded-xl transition-all gap-2">
              <Github className="h-4 w-4" />
              GITHUB
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center mt-10 text-[11px] font-medium text-zinc-600">
          Authorization required for multi-agent execution. <br />
          <Link href="#" className="text-emerald-500/70 hover:text-emerald-400 transition-colors underline underline-offset-4 decoration-emerald-500/20">
            Request Protocol Access
          </Link>
        </p>
      </div>
    </div>
  );
}
