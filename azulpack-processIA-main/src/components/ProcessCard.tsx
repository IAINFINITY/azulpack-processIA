import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, MoreVertical } from "lucide-react";
import { Processo } from "@/types";
import { Link } from "react-router-dom";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import CreateProcessDialog from "./CreateProcessDialog";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProcessCardProps {
  processo: Processo;
  viewMode?: 'grid' | 'list';
  onProcessUpdated?: () => void;
}

const statusMap = {
  andamento: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800' },
  concluido: { label: 'Concluído', color: 'bg-green-100 text-green-800' },
};

const ProcessCard = ({ processo, viewMode = 'grid', onProcessUpdated }: ProcessCardProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Função para truncar texto e adicionar '...'
  const truncate = (text: string, max: number) => {
    if (!text) return '';
    return text.length > max ? text.slice(0, max).trim() + '...' : text;
  };

  // Usar status real do processo
  const status = processo.status === 'concluido' ? 'concluido' : 'andamento';
  const statusInfo = statusMap[status];

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Primeiro deletar os chats relacionados
      const { error: chatError } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('processo_id', processo.id);

      if (chatError) {
        console.error("Erro ao deletar chats:", chatError);
      }

      // Depois deletar o processo
      const { error } = await supabase
        .from('processos')
        .delete()
        .eq('id', processo.id);

      if (error) throw error;

      toast({
        title: "Processo excluído com sucesso!",
        description: "O processo foi removido permanentemente.",
      });

      if (onProcessUpdated) {
        onProcessUpdated();
      }
    } catch (error: any) {
      console.error("Erro ao excluir processo:", error);
      toast({
        title: "Erro ao excluir processo",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  };

  const handleEditComplete = () => {
    setEditOpen(false);
    if (onProcessUpdated) {
      onProcessUpdated();
    }
  };

  if (viewMode === 'list') {
    return (
      <>
        <Link to={`/processo/${processo.id}`} className="block group">
          <Card className="flex flex-col md:flex-row justify-between items-center w-full p-6 gap-4 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer min-h-[156px] h-[156px] md:h-[140px]">
            <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <h2 className="font-semibold text-lg truncate">{processo.titulo || `Processo #${processo.id}`}</h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button 
                        className="p-2 rounded-lg hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-200"
                        onClick={(e) => e.preventDefault()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { 
                        e.preventDefault(); 
                        e.stopPropagation(); 
                        setEditOpen(true); 
                      }}>
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={(e) => { 
                          e.preventDefault(); 
                          e.stopPropagation(); 
                          setDeleteOpen(true); 
                        }}
                      >
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {processo.numero_processo && (
                  <p className="text-sm text-muted-foreground mb-1">Nº {processo.numero_processo}</p>
                )}
                {processo.descricao && (
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-3">{truncate(processo.descricao, 100)}</p>
                )}
              </div>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-4 text-xs text-muted-foreground min-w-[120px]">
              <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />Criado em {formatDate(processo.created_at)}</div>
            </div>
          </Card>
        </Link>

        <CreateProcessDialog 
          processo={processo} 
          onProcessCreated={handleEditComplete}
          open={editOpen}
          onOpenChange={setEditOpen}
        />

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o processo "{processo.titulo || `Processo #${processo.id}`}"? 
                Esta ação não pode ser desfeita e todos os chats relacionados também serão excluídos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // grid
  return (
    <>
      <Link to={`/processo/${processo.id}`} className="block group">
        <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer min-h-[220px] h-[220px] flex flex-col">
          <CardHeader className="pb-3 flex-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {processo.titulo || `Processo #${processo.id}`}
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button 
                      className="p-2 rounded-lg hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-200"
                      onClick={(e) => e.preventDefault()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation(); 
                      setEditOpen(true); 
                    }}>
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={(e) => { 
                        e.preventDefault(); 
                        e.stopPropagation(); 
                        setDeleteOpen(true); 
                      }}
                    >
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            {processo.numero_processo && (
              <p className="text-sm text-muted-foreground">Nº {processo.numero_processo}</p>
            )}
          </CardHeader>
          <CardContent className="pt-0 flex-1 flex flex-col justify-between">
            <div>
              {processo.descricao && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{truncate(processo.descricao, 120)}</p>
              )}
            </div>
            <div className="flex items-center justify-between mt-auto">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatDate(processo.created_at)}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      <CreateProcessDialog 
        processo={processo} 
        onProcessCreated={handleEditComplete}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o processo "{processo.titulo || `Processo #${processo.id}`}"? 
              Esta ação não pode ser desfeita e todos os chats relacionados também serão excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProcessCard;
