import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ChatMensagem, ChatResposta, ChatSession } from "@/types";
import ChatInterface from "@/components/ChatInterface";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ChatPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMensagem[]>([]);
  const [responses, setResponses] = useState<{ [key: number]: ChatResposta[] }>({});
  const [loading, setLoading] = useState(true);

  const loadSession = async () => {
    if (!sessionId) return;
    
    const sessionIdNumber = parseInt(sessionId);
    if (isNaN(sessionIdNumber)) {
      toast({
        title: "ID de sessão inválido",
        description: "O ID da sessão deve ser um número válido.",
        variant: "destructive",
      });
      navigate('/');
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select(`
          *,
          processo:processos(*)
        `)
        .eq('id', sessionIdNumber)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast({
            title: "Chat não encontrado",
            description: "O chat solicitado não existe ou você não tem permissão para visualizá-lo.",
            variant: "destructive",
          });
          navigate('/');
          return;
        }
        throw error;
      }
      
      setSession(data);
    } catch (error: any) {
      console.error("Erro ao carregar sessão:", error);
      toast({
        title: "Erro ao carregar chat",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    }
  };

  const loadMessages = async () => {
    if (!sessionId) return;
    
    const sessionIdNumber = parseInt(sessionId);
    if (isNaN(sessionIdNumber)) return;
    
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_mensagens')
        .select('*')
        .eq('session_id', sessionIdNumber)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;
      
      setMessages(messagesData || []);

      // Carregar respostas para cada mensagem
      if (messagesData && messagesData.length > 0) {
        const messageIds = messagesData.map(msg => msg.id);
        
        const { data: responsesData, error: responsesError } = await supabase
          .from('chat_respostas')
          .select('*')
          .in('id_pergunta', messageIds)
          .order('created_at', { ascending: true });

        if (responsesError) throw responsesError;

        // Organizar respostas por id da pergunta
        const responsesMap: { [key: number]: ChatResposta[] } = {};
        responsesData?.forEach(response => {
          if (!responsesMap[response.id_pergunta]) {
            responsesMap[response.id_pergunta] = [];
          }
          responsesMap[response.id_pergunta].push(response);
        });
        
        setResponses(responsesMap);
      }
    } catch (error: any) {
      console.error("Erro ao carregar mensagens:", error);
      toast({
        title: "Erro ao carregar mensagens",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadSession(), loadMessages()]);
      setLoading(false);
    };

    loadData();
  }, [sessionId]);

  const handleMessageSent = () => {
    loadMessages();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Chat não encontrado</h2>
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

  const sessionIdNumber = parseInt(sessionId!);

  return (
    <div className="h-[calc(100vh-4rem)] bg-background">
      <div className="container mx-auto px-4 h-full">
        <div className="max-w-4xl mx-auto h-full">
          <div className="h-full flex flex-col bg-background">
            <div className="flex-1 overflow-hidden">
              <ChatInterface
                sessionId={sessionIdNumber}
                messages={messages}
                responses={responses}
                onMessageSent={handleMessageSent}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
