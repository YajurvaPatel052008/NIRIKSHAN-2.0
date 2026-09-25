"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password")
});

const registerSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Use at least 8 characters"),
  full_name: z.string().min(2, "Enter your full name")
});

export default function AuthForm({ mode }) {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [serverError, setServerError] = useState("");
  const isLogin = mode === "login";
  const schema = isLogin ? loginSchema : registerSchema;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({ mode: "onBlur" });

  const onSubmit = async (values) => {
    setServerError("");
    const result = schema.safeParse(values);
    if (!result.success) {
      setServerError(result.error.issues[0]?.message || "Check the form fields.");
      return;
    }

    try {
      if (isLogin) {
        const form = new URLSearchParams();
        form.set("username", values.email);
        form.set("password", values.password);
        const { data } = await api.post("/api/auth/login", form, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });
        const me = await api.get("/api/auth/me", {
          headers: { Authorization: `Bearer ${data.access_token}` }
        });
        setAuth({ token: data.access_token, user: me.data });
      } else {
        await api.post("/api/auth/register", {
          email: values.email,
          password: values.password,
          full_name: values.full_name
        });
        const form = new URLSearchParams();
        form.set("username", values.email);
        form.set("password", values.password);
        const { data } = await api.post("/api/auth/login", form, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });
        const me = await api.get("/api/auth/me", {
          headers: { Authorization: `Bearer ${data.access_token}` }
        });
        setAuth({ token: data.access_token, user: me.data });
      }
      router.replace("/dashboard");
    } catch (error) {
      setServerError(
        error.response?.data?.detail || "Unable to complete the request. Try again."
      );
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">
            NIRIKSHAN
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-text">
            {isLogin ? "Sign in to your workspace" : "Create an officer account"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-textMuted">
            {isLogin
              ? "Access standards recommendations and procurement analysis."
              : "Start with an officer account for procurement analysis."}
          </p>
        </div>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-md border border-border bg-surface p-8"
          noValidate
        >
          {!isLogin && (
            <Field
              label="Full name"
              name="full_name"
              type="text"
              register={register}
              error={errors.full_name}
            />
          )}
          <Field
            label="Email address"
            name="email"
            type="email"
            register={register}
            error={errors.email}
          />
          <Field
            label="Password"
            name="password"
            type="password"
            register={register}
            error={errors.password}
          />
          {serverError && (
            <p className="mb-4 border border-error/30 bg-error/5 px-3 py-2 text-sm text-error" role="alert">
              {serverError}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primaryDark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Working…" : isLogin ? "Sign in" : "Create account"}
          </button>
          <p className="mt-6 text-center text-sm text-textMuted">
            {isLogin ? "Need an account?" : "Already have an account?"}{" "}
            <Link
              href={isLogin ? "/register" : "/login"}
              className="font-semibold text-primary underline decoration-accent underline-offset-4"
            >
              {isLogin ? "Register as an officer" : "Sign in"}
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

function Field({ label, name, type, register, error }) {
  return (
    <label className="mb-5 block">
      <span className="mb-2 block text-sm font-medium text-text">{label}</span>
      <input
        {...register(name)}
        type={type}
        className="w-full rounded-md border border-border bg-surface px-3 py-3 text-sm text-text placeholder:text-textMuted/70 focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
        aria-invalid={Boolean(error)}
      />
      {error && <span className="mt-1 block text-xs text-error">{error.message}</span>}
    </label>
  );
}
