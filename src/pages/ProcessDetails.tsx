import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Processo, ChatSession } from "@/types";
import ChatSessionCard from "@/components/ChatSessionCard";
import CreateChatDialog from "@/components/CreateChatDialog";
import DefenseManager from "@/components/DefenseManager";
import SummaryManager from "@/components/SummaryManager";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const ProcessDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAdmin, logAuditEvent } = useAuth();
  const [processo, setProcesso] = useState<Processo | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProcesso = async () => {
    if (!id) return;
    
    const processoId = parseInt(id);
    if (isNaN(processoId)) {
      toast({
        title: "ID de processo inválido",
        description: "O ID do processo deve ser um número válido.",
        variant: "destructive",
      });
      navigate('/');
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('processos')
        .select('*')
        .eq('id', processoId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast({
            title: "Processo não encontrado",
            description: "O processo solicitado não existe ou você não tem permissão para visualizá-lo.",
            variant: "destructive",
          });
          navigate('/');
          return;
        }
        throw error;
      }
      
      setProcesso(data);
      
      // Registrar acesso ao processo
      if (user) {
        await logAuditEvent('VIEW_PROCESS', 'PROCESS', data.id);
      }
    } catch (error: any) {
      console.error("Erro ao carregar processo:", error);
      toast({
        title: "Erro ao carregar processo",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    }
  };

  const loadChatSessions = async () => {
    if (!id) return;
    
    const processoId = parseInt(id);
    if (isNaN(processoId)) return;
    
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('processo_id', processoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setChatSessions(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar chats:", error);
      toast({
        title: "Erro ao carregar chats",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadProcesso(), loadChatSessions()]);
      setLoading(false);
    };

    loadData();
  }, [id]);

  const handleChatCreated = () => {
    loadChatSessions();
  };

  const handleChatRenamed = () => {
    loadChatSessions();
  };

  const handleDefenseUpdated = (defesa: string) => {
    if (processo) {
      setProcesso({ ...processo, defesa });
    }
  };

  const handleSummaryUpdated = (resumo: string) => {
    if (processo) {
      setProcesso({ ...processo, resumo });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-40 bg-muted rounded"></div>
              <div className="h-40 bg-muted rounded"></div>
            </div>
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!processo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Processo não encontrado</h2>
          <Button asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para lista
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        
        {/* Blocos do Processo e Defesa */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Bloco da Esquerda - Resumo do Processo */}
          <SummaryManager 
            processo={processo} 
            onSummaryUpdated={handleSummaryUpdated}
          />

          {/* Bloco da Direita - Resumo da Defesa */}
          <DefenseManager 
            processo={processo} 
            onDefenseUpdated={handleDefenseUpdated}
          />
        </div>

      </div>
    </div>
  );
};

export default ProcessDetails;
