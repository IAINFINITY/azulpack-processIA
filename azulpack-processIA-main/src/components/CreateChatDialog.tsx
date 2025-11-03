import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface CreateChatDialogProps {
  processoId: number;
  onChatCreated: () => void;
}

const CreateChatDialog = ({ processoId, onChatCreated }: CreateChatDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleCreateChat = async () => {
    if (!user) return;
    
    setLoading(true);

    try {
      const { error } = await supabase
        .from('chat_sessions')
        .insert([{
          user_uuid: user.id,
          processo_id: processoId,
          instancia_dify: null
        }]);

      if (error) throw error;
      
      toast({
        title: "Chat criado com sucesso!",
        description: "Você pode começar a conversar com a IA agora.",
      });
      
      setOpen(false);
      onChatCreated();
    } catch (error: any) {
      console.error("Erro ao criar chat:", error);
      toast({
        title: "Erro ao criar chat",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Chat
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Chat</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Deseja criar um novo chat com a IA para este processo? 
            Você poderá fazer perguntas e receber orientações especializadas.
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateChat} disabled={loading}>
              {loading ? "Criando..." : "Criar Chat"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateChatDialog;
