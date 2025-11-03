import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navigation from "@/components/Navigation";
import ProcessList from "./pages/ProcessList";
import ProcessDetails from "./pages/ProcessDetails";
import ChatPage from "./pages/ChatPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import RecuperarSenha from "./pages/RecuperarSenha";
import EditarSenha from "./pages/EditarSenha";

const queryClient = new QueryClient();

const App = () => {
  const [search, setSearch] = useState("");

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Navigation centerSlot={
              location.pathname === "/" ? (
                <Input
                  placeholder="Buscar processos..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full max-w-md"
                />
              ) : null
            } />
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/recuperar-senha" element={<RecuperarSenha />} />
              <Route path="/editar-senha" element={<EditarSenha />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <ProcessList search={search} />
                </ProtectedRoute>
              } />
              <Route path="/processo/:id" element={
                <ProtectedRoute>
                  <ProcessDetails />
                </ProtectedRoute>
              } />
              <Route path="/chat/:sessionId" element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
