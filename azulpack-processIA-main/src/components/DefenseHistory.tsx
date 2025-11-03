
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { History, RotateCcw, Clock, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Processo } from "@/types";
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { ptBR } from "date-fns/locale";

interface DefenseHistoryItem {
  id: number;
  conteudo: string;
  versao: number;
  created_at: string;
  user_id: string;
}

interface DefenseHistoryProps {
  processo: Processo;
  onRestoreVersion: (content: string) => void;
  currentContent: string;
}

const DefenseHistory = ({ processo, onRestoreVersion, currentContent }: DefenseHistoryProps) => {
  const [history, setHistory] = useState<DefenseHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('defesa_historico')
        .select('*')
        .eq('processo_id', processo.id)
        .order('versao', { ascending: false });

      if (error) throw error;
      
      setHistory(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar histórico:", error);
      toast({
        title: "Erro ao carregar histórico",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [processo.id, isOpen]);

  const handleRestore = async (content: string, versao: number) => {
    try {
      // Atualizar o processo com o conteúdo da versão selecionada
      const { error } = await supabase
        .from('processos')
        .update({ defesa: content })
        .eq('id', processo.id);

      if (error) throw error;

      // Salvar uma nova versão no histórico indicando que foi uma restauração
      if (user) {
        const { data: nextVersionData } = await supabase
          .rpc('get_next_defense_version', { p_processo_id: processo.id });

        await supabase
          .from('defesa_historico')
          .insert({
            processo_id: processo.id,
            user_id: user.id,
            conteudo: content,
            versao: nextVersionData || 1
          });
      }

      onRestoreVersion(content);
      await loadHistory();
      setIsOpen(false);
      
      toast({
        title: "Versão restaurada com sucesso!",
        description: `A versão ${versao} foi restaurada.`,
      });
    } catch (error: any) {
      console.error("Erro ao restaurar versão:", error);
      toast({
        title: "Erro ao restaurar versão",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    }
  };

  // Função para renderizar negrito entre **texto**
  function renderBold(text: string) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (/^\*\*[^*]+\*\*$/.test(part)) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  }

  const truncateText = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Versões
            </DialogTitle>
          </DialogHeader>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Versões ({history.length})
          </DialogTitle>
        </DialogHeader>
        {history.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Nenhuma versão anterior encontrada.
          </p>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {history.map((item, index) => {
                const isCurrentVersion = item.conteudo === currentContent;
                
                return (
                  <div
                    key={item.id}
                    className={`border rounded-lg p-4 ${
                      isCurrentVersion ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={isCurrentVersion ? "default" : "secondary"}>
                          Versão {item.versao}
                        </Badge>
                        {isCurrentVersion && (
                          <Badge variant="outline" className="text-xs">
                            Atual
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(item.created_at), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </div>
                    </div>
                    
                    <div className="text-sm mb-3">
                      <p className="whitespace-pre-wrap">
                        {renderBold(truncateText(item.conteudo))}
                      </p>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        Versão {item.versao}
                      </div>
                      
                      {!isCurrentVersion && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestore(item.conteudo, item.versao)}
                          className="text-xs"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Restaurar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DefenseHistory;
