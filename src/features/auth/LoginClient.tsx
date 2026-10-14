'use client';
import { useRouter } from 'next/navigation';
import { LoginForm } from './LoginForm';

export function LoginClient() {
  const router = useRouter();
  return <LoginForm onDone={() => { router.replace('/overview'); router.refresh(); }} />;
}
