import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirect to the main passenger dashboard
  redirect('/home');
}