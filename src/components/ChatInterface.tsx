import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import { ChatMensagem, ChatResposta, WebhookRequest } from "@/types";
import ChatMessage from "./ChatMessage";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ChatInterfaceProps {
  sessionId: number;
  messages: ChatMensagem[];
  responses: {
    [key: number]: ChatResposta[];
  };
  onMessageSent: () => void;
}

const ChatInterface = ({
  sessionId,
  messages,
  responses,
  onMessageSent
}: ChatInterfaceProps) => {
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, responses]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || loading || !user) return;

    const messageText = inputValue.trim();
    setInputValue("");
    setLoading(true);

    try {
      console.log("Enviando mensagem:", messageText);

      // Inserir mensagem no Supabase (mantendo as quebras de linha)
      const { data: messageData, error: messageError } = await supabase
        .from('chat_mensagens')
        .insert({
          pergunta: messageText,
          session_id: sessionId
        })
        .select()
        .single();

      if (messageError) {
        console.error("Erro ao salvar mensagem:", messageError);
        throw messageError;
      }

      console.log("Mensagem salva com sucesso:", messageData);

      // Atualizar a interface imediatamente com a nova mensagem
      onMessageSent();
      // Forçar scroll para baixo após a mensagem ser enviada
      setTimeout(scrollToBottom, 100);

      // Buscar instancia_dify da sessão atual
      const { data: sessionData, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('instancia_dify')
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        console.error("Erro ao buscar sessão:", sessionError);
        throw sessionError;
      }

      console.log("Dados da sessão:", sessionData);

      // Preparar payload para o webhook n8n (removendo quebras de linha)
      const webhookPayload: WebhookRequest = {
        action: "sendMessage",
        sessionId: sessionId.toString(),
        chatInput: messageText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim(),
        ask_id: messageData.id.toString(),
        user: user.id,
        session_dify: sessionData.instancia_dify || ""
      };

      console.log("Enviando para webhook n8n:", webhookPayload);

      // Enviar para o webhook
      const response = await fetch('https://webhookauto.iainfinity.com.br/webhook/gps-chat-ia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(webhookPayload)
      });

      console.log("Status da resposta do webhook:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erro na resposta do webhook:", errorText);
        throw new Error(`Erro na requisição: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      console.log("Resposta do webhook recebida:", responseData);

      // Processar todas as respostas e salvar no banco
      if (Array.isArray(responseData) && responseData.length > 0) {
        console.log(`Processando ${responseData.length} mensagens da resposta`);
        
        // Processar cada mensagem na ordem
        for (let i = 0; i < responseData.length; i++) {
          const messageItem = responseData[i];
          const responseMessage = messageItem.message || messageItem.text || JSON.stringify(messageItem);
          
          console.log(`Salvando resposta ${i + 1}:`, responseMessage);

          // Salvar cada resposta no banco
          const { data: respostaData, error: respostaError } = await supabase
            .from('chat_respostas')
            .insert({
              resposta: responseMessage,
              id_pergunta: messageData.id
            })
            .select()
            .single();

          if (respostaError) {
            console.error(`Erro ao salvar resposta ${i + 1}:`, respostaError);
          } else {
            console.log(`Resposta ${i + 1} salva com sucesso:`, respostaData);
          }
        }

        // Atualizar instancia_dify se retornado na primeira resposta
        const firstResponse = responseData[0];
        if (firstResponse.session_id || firstResponse.conversation_id) {
          const newSessionDify = firstResponse.session_id || firstResponse.conversation_id;
          console.log("Atualizando session_dify para:", newSessionDify);

          const { error: updateError } = await supabase
            .from('chat_sessions')
            .update({ instancia_dify: newSessionDify })
            .eq('id', sessionId);

          if (updateError) {
            console.error("Erro ao atualizar session_dify:", updateError);
          } else {
            console.log("Session_dify atualizado com sucesso");
          }
        }
      } else {
        console.warn("Resposta do webhook não é um array ou está vazia:", responseData);
        toast({
          title: "Aviso",
          description: "A IA não retornou uma resposta válida.",
          variant: "destructive"
        });
      }

      // Atualizar interface novamente para mostrar as respostas
      onMessageSent();
      // Forçar scroll para baixo após as respostas chegarem
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error("Erro completo ao enviar mensagem:", error);
      toast({
        title: "Erro ao enviar mensagem",
        description: error instanceof Error ? error.message : "Tente novamente em alguns instantes.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow Shift+Enter to create a new line
        return;
      }
      
      if (isMobile) {
        // On mobile, Enter just creates a new line
        return;
      }

      // On desktop, Enter sends the message
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-4rem)]">
      {/* Área de mensagens com scroll */}
      <div className="flex-1 min-h-0">
        <ScrollArea ref={scrollAreaRef} className="h-full">
          <div className="space-y-6 p-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Inicie uma conversa com a IA especializada em direito trabalhista.
                </p>
              </div>
            ) : (
              messages.map(message => (
                <ChatMessage 
                  key={message.id} 
                  message={message} 
                  responses={responses[message.id] || []} 
                />
              ))
            )}
            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground px-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Processando sua resposta...</span>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Campo de entrada fixo na parte inferior */}
      <div className="p-4 bg-background shrink-0">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isMobile ? "Digite sua mensagem..." : "Digite sua mensagem... (Shift + Enter para nova linha)"}
            disabled={loading}
            className="flex-1 resize-none min-h-[40px] max-h-[150px]"
            rows={1}
          />
          <Button type="submit" disabled={loading || !inputValue.trim()} className="self-end">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
