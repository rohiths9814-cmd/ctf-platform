import { Outlet } from 'react-router-dom';
import TopNav from './TopNav';
import Footer from './Footer';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="pt-24 px-container-padding pb-20 max-w-[1400px] mx-auto">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
