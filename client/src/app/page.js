"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
      const userData = JSON.parse(user);
      if (userData.role === 'super_admin' || userData.role === 'admin') {
        router.push('/dashboard/super-admin');
      } else {
        router.push('/dashboard');
      }
    } else {
      // Redirect to login page
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}
