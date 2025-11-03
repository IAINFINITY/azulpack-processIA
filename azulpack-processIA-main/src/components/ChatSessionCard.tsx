
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Calendar } from "lucide-react";
import { ChatSession } from "@/types";
import { Link } from "react-router-dom";
import ChatRenameDialog from "./ChatRenameDialog";

interface ChatSessionCardProps {
  session: ChatSession;
  onRenamed: () => void;
}

const ChatSessionCard = ({ session, onRenamed }: ChatSessionCardProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="hover:shadow-md transition-shadow duration-200 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            {session.nome || `Chat #${session.id}`}
          </CardTitle>
          <ChatRenameDialog session={session} onRenamed={onRenamed} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatDate(session.created_at)}
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to={`/chat/${session.id}`}>
              Abrir Chat
            </Link>
          </Button>
        </div>
        {session.instancia_dify && (
          <div className="mt-2 text-xs text-muted-foreground">
            IA Ativa
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChatSessionCard;
