"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, User } from "lucide-react";
import clsx from "clsx";
import { useRegister } from "@/hooks/useAccrual";

interface RegistrationBannerProps {
  onRegisterSuccess?: () => void;
}

export default function RegistrationBanner({ onRegisterSuccess }: RegistrationBannerProps) {
  const [username, setUsername] = useState("");
  const register = useRegister();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      register.mutate(username.trim(), {
        onSuccess: () => {
          onRegisterSuccess?.();
        },
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/5 to-card p-6"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/20">
            <Sparkles className="h-5 w-5 text-gold" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg font-semibold text-text">
              Welcome to AutoMint!
            </h3>
            <p className="mt-1 text-sm text-muted">
              Register to start minting AI bot NFTs and earning points on the Stellar network.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className="text-xs font-medium text-muted">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                disabled={register.isPending}
                className={clsx(
                  "w-full rounded-xl border border-liner bg-card-2 px-10 py-2.5",
                  "text-sm text-text placeholder:text-muted/50",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
                maxLength={32}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={register.isPending || !username.trim()}
            className={clsx(
              "flex min-h-11 items-center justify-center gap-2 rounded-xl",
              "border border-gold/30 bg-gold/10 px-4 py-2.5",
              "text-sm font-medium text-gold",
              "transition-all",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "hover:bg-gold/20 hover:border-gold/50"
            )}
          >
            {register.isPending ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gold border-t-transparent" />
                Registering...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Register & Get Started
              </>
            )}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
