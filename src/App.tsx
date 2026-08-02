import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import PageLoader from "@/components/PageLoader";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Pedidos = lazy(() => import("@/pages/Pedidos"));
const Cardapio = lazy(() => import("@/pages/Cardapio"));
const Historico = lazy(() => import("@/pages/Historico"));
const Financeiro = lazy(() => import("@/pages/Financeiro"));
const Relatorios = lazy(() => import("@/pages/Relatorios"));
const Estoque = lazy(() => import("@/pages/Estoque"));
const AssistenteFinanceiro = lazy(() => import("@/pages/AssistenteFinanceiro"));
const Clientes = lazy(() => import("@/pages/Clientes"));
const PratoDoDia = lazy(() => import("@/pages/PratoDoDia"));
const Sorteio = lazy(() => import("@/pages/Sorteio"));
const Auth = lazy(() => import("@/pages/Auth"));
const CardapioOnline = lazy(() => import("@/pages/CardapioOnline"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AuthRoute() {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (session) return <Navigate to="/" replace />;
  return <Auth />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<AuthRoute />} />
              <Route path="/cardapio-online" element={<CardapioOnline />} />
              <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
              <Route path="/pedidos" element={<ProtectedRoute><AppLayout><Pedidos /></AppLayout></ProtectedRoute>} />
              <Route path="/cardapio" element={<ProtectedRoute><AppLayout><Cardapio /></AppLayout></ProtectedRoute>} />
              <Route path="/historico" element={<ProtectedRoute><AppLayout><Historico /></AppLayout></ProtectedRoute>} />
              <Route path="/financeiro" element={<ProtectedRoute><AppLayout><Financeiro /></AppLayout></ProtectedRoute>} />
              <Route path="/relatorios" element={<ProtectedRoute><AppLayout><Relatorios /></AppLayout></ProtectedRoute>} />
              <Route path="/estoque" element={<ProtectedRoute><AppLayout><Estoque /></AppLayout></ProtectedRoute>} />
              <Route path="/assistente" element={<ProtectedRoute><AppLayout><AssistenteFinanceiro /></AppLayout></ProtectedRoute>} />
              <Route path="/clientes" element={<ProtectedRoute><AppLayout><Clientes /></AppLayout></ProtectedRoute>} />
              <Route path="/prato-do-dia" element={<ProtectedRoute><AppLayout><PratoDoDia /></AppLayout></ProtectedRoute>} />
              <Route path="/sorteio" element={<ProtectedRoute><AppLayout><Sorteio /></AppLayout></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
