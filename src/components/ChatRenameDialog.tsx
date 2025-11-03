
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ChatSession } from "@/types";

interface ChatRenameDialogProps {
  session: ChatSession;
  onRenamed: () => void;
}

const ChatRenameDialog = ({ session, onRenamed }: ChatRenameDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(session.nome || `Chat #${session.id}`);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;
    
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .update({ nome: name.trim() })
        .eq('id', session.id);

      if (error) throw error;

      toast({
        title: "Chat renomeado!",
        description: `Chat renomeado para "${name.trim()}".`,
      });

      onRenamed();
      setOpen(false);
    } catch (error: any) {
      console.error("Erro ao renomear chat:", error);
      toast({
        title: "Erro ao renomear",
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
        <Button variant="ghost" size="sm">
          <Pencil className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Renomear Chat</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleRename} className="space-y-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do chat"
            disabled={loading}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChatRenameDialog;
