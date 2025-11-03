import { ChatMensagem, ChatResposta } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Bot } from "lucide-react";

interface ChatMessageProps {
  message: ChatMensagem;
  responses?: ChatResposta[];
}

const ChatMessage = ({ message, responses }: ChatMessageProps) => {
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        return <strong key={index}>{boldText}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="space-y-4">
      {/* Mensagem do usuário */}
      <div className="flex items-start gap-3 justify-end">
        <div className="flex-1 space-y-1 max-w-[80%]">
          <div className="flex items-center gap-2 justify-end">
            <span className="text-xs text-muted-foreground">
              {formatTime(message.created_at)}
            </span>
            <span className="text-sm font-medium">Você</span>
          </div>
          <div className="block w-fit ml-auto">
            <div className="bg-primary text-primary-foreground p-3 rounded-lg rounded-tr-none">
              <p className="text-sm whitespace-pre-wrap break-words">{formatText(message.pergunta)}</p>
            </div>
          </div>
        </div>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Respostas da IA */}
      {responses && responses.length > 0 && (
        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-secondary">
              <Bot className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1 max-w-[80%]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">IA Trabalhista</span>
              <span className="text-xs text-muted-foreground">
                {formatTime(responses[0].created_at)}
              </span>
            </div>
            <div className="space-y-2">
              {responses.map((response) => (
                <div
                  key={response.id}
                  className="block w-fit"
                >
                  <div className="bg-muted p-3 rounded-lg rounded-tl-none">
                    <p className="text-sm whitespace-pre-wrap break-words">{formatText(response.resposta)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
