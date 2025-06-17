"use client";

import Link from "next/link";
import { withFadeIn } from "@/lib/withFadeIn";
import { useState } from "react";

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setStatus("sent");
        setForm({ name: "", email: "", message: "" });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <section className="space-y-12 py-16">
      <h1 className="text-3xl font-bold">Contact Me</h1>

      <p className="text-lg text-gray-700 max-w-2xl leading-relaxed">
        Whether you're building a new product, scaling an existing platform, or just want to
        connect — I'd love to hear from you.
      </p>

      {/* Direct contact links */}
      <div className="space-y-4">
        <ContactLink label="Email" href="mailto:hagon@example.com" />
        <ContactLink label="GitHub" href="https://github.com/yourusername" />
        <ContactLink label="LinkedIn" href="https://linkedin.com/in/yourusername" />
      </div>

      {/* Contact Form */}
      <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
        <input
          name="name"
          placeholder="Your name"
          value={form.name}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />
        <input
          name="email"
          type="email"
          placeholder="Your email"
          value={form.email}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />
        <textarea
          name="message"
          placeholder="Your message"
          value={form.message}
          onChange={handleChange}
          className="w-full p-2 border rounded h-32"
          required
        />
        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition"
          disabled={status === "sending"}
        >
          {status === "sending" ? "Sending..." : "Send Message"}
        </button>
        {status === "sent" && <p className="text-green-600">Message sent!</p>}
        {status === "error" && <p className="text-red-600">Something went wrong.</p>}
      </form>
    </section>
  );
}

function ContactLink({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="inline-block text-black hover:underline underline-offset-4 text-lg"
      target="_blank"
      rel="noopener noreferrer"
    >
      {label}
    </Link>
  );
}

export default withFadeIn(ContactPage);
