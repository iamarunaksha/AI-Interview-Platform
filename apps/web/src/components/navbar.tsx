"use client";

import React, { useSyncExternalStore } from "react";
import Link from "next/link";
import { useAuth } from "../context/auth-context";
import { SystemHealthIndicator } from "./system-health-indicator";

const emptySubscribe = () => () => {};

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const isAuth = isClient && isAuthenticated;

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
              AI
            </div>
            <span className="font-semibold text-lg tracking-tight text-zinc-900 dark:text-white">
              InterviewAI
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            <Link
              href="/tracks"
              className="hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Question Bank
            </Link>
            <Link
              href="/onboarding"
              className="hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Tracks & Setup
            </Link>
            {isAuth && (
              <Link
                href="/dashboard"
                className="hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                Dashboard
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block">
            <SystemHealthIndicator />
          </div>

          {isAuth && user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:inline">
                Signed in as{" "}
                <strong className="text-zinc-800 dark:text-zinc-200">
                  {user.name}
                </strong>
              </span>
              <button
                onClick={logout}
                className="text-xs px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-xs px-3 py-1.5 rounded-md text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="text-xs px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
