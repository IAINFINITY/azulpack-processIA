import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Scale, User, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavigationProps {
  centerSlot?: React.ReactNode;
}

const Navigation = ({ centerSlot }: NavigationProps) => {
  const {
    user,
    signOut
  } = useAuth();
  const {
    toast
  } = useToast();
  const location = useLocation();
  const [pageTitle, setPageTitle] = useState<string>("");
  const [processId, setProcessId] = useState<number | null>(null);
  const isChatPage = location.pathname.startsWith('/chat/');
  const isProcessPage = location.pathname.startsWith('/processo/');

  useEffect(() => {
    const loadPageTitle = async () => {
      // Check if we're in a chat page
      const chatMatch = location.pathname.match(/^\/chat\/(\d+)$/);
      const processMatch = location.pathname.match(/^\/processo\/(\d+)$/);
      
      if (chatMatch) {
        const sessionId = parseInt(chatMatch[1]);
        try {
          const { data, error } = await supabase
            .from('chat_sessions')
            .select(`
              *,
              processo:processos(*)
            `)
            .eq('id', sessionId)
            .single();

          if (error) throw error;
          setPageTitle(data.processo?.titulo || `Processo #${data.processo_id}`);
          setProcessId(data.processo_id);
        } catch (error) {
          console.error("Erro ao carregar título do chat:", error);
          setPageTitle("");
          setProcessId(null);
        }
      } else if (processMatch) {
        const procId = parseInt(processMatch[1]);
        try {
          const { data, error } = await supabase
            .from('processos')
            .select('titulo')
            .eq('id', procId)
            .single();

          if (error) throw error;
          setPageTitle(data.titulo || `Processo #${procId}`);
          setProcessId(procId);
        } catch (error) {
          console.error("Erro ao carregar título do processo:", error);
          setPageTitle("");
          setProcessId(null);
        }
      } else {
        setPageTitle("");
        setProcessId(null);
      }
    };

    loadPageTitle();
  }, [location.pathname]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Logout realizado com sucesso!",
        description: "Até logo!"
      });
    } catch (error) {
      toast({
        title: "Erro no logout",
        description: "Tente novamente.",
        variant: "destructive"
      });
    }
  };

  return <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between relative">
        <div className="flex items-center gap-4">
          {(isChatPage || isProcessPage) && (
            <Button asChild variant="ghost" size="sm">
              <Link to={isChatPage ? `/processo/${processId}` : "/"}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Link>
            </Button>
          )}
          {!isChatPage && !isProcessPage && (
            <div className="flex items-center gap-2">
              <Scale className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">AZUL PACK CHAT</span>
            </div>
          )}
        </div>
        {!isChatPage && !isProcessPage && centerSlot && (
          <div className="absolute left-1/2 transform -translate-x-1/2 w-[350px] max-w-full flex justify-center">{centerSlot}</div>
        )}
        {(isChatPage || isProcessPage) && pageTitle && (
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <h1 className="text-lg font-semibold">{pageTitle}</h1>
          </div>
        )}
        
        {user && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              {user.email}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </nav>;
};
export default Navigation;