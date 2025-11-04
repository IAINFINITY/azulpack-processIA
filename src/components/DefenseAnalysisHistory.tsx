import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { History, Eye, Clock, User } from "lucide-react";
import { Processo, DefenseAnalysisItem } from "@/types";
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { ptBR } from "date-fns/locale";

interface DefenseAnalysisHistoryProps {
  processo: Processo;
  analysisHistory: DefenseAnalysisItem[];
  onAnalysisSelected: (analysis: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DefenseAnalysisHistory = ({ 
  processo, 
  analysisHistory, 
  onAnalysisSelected,
  open = true,
  onOpenChange
}: DefenseAnalysisHistoryProps) => {
  const [selectedAnalysis, setSelectedAnalysis] = useState<DefenseAnalysisItem | null>(null);

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

  const handleSelectAnalysis = (analysis: DefenseAnalysisItem) => {
    onAnalysisSelected(analysis.conteudo_analise);
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Análises ({analysisHistory.length})
          </DialogTitle>
        </DialogHeader>
        
        {analysisHistory.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhuma análise encontrada.
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[60vh] overflow-hidden">
            {/* Lista de Análises */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Análises</h3>
              <ScrollArea className="h-[50vh]">
                <div className="space-y-3 pr-4">
                  {analysisHistory.map((item) => (
                    <Card 
                      key={item.id}
                      className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedAnalysis?.id === item.id ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => setSelectedAnalysis(item)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="secondary">
                            Versão {item.versao}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(item.created_at), {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </div>
                        </div>
                        
                        <p className="text-sm mb-3 line-clamp-3">
                          {truncateText(item.conteudo_analise, 150)}
                        </p>
                        
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            Análise {item.versao}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectAnalysis(item);
                            }}
                            className="text-xs"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Selecionar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Visualização Detalhada */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Detalhes da Análise</h3>
              {selectedAnalysis ? (
                <ScrollArea className="h-[50vh]">
                  <div className="space-y-4 pr-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span>Versão {selectedAnalysis.versao}</span>
                          <Badge variant="secondary">
                            {formatDistanceToNow(new Date(selectedAnalysis.created_at), {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium text-sm mb-2">Análise:</h4>
                            <p className="text-sm whitespace-pre-wrap border rounded p-3 bg-muted/50">
                              {renderBold(selectedAnalysis.conteudo_analise)}
                            </p>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-sm mb-2">Defesa Analisada:</h4>
                            <p className="text-sm whitespace-pre-wrap border rounded p-3 bg-muted/20">
                              {renderBold(selectedAnalysis.defesa_analisada)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center h-[50vh] text-muted-foreground">
                  <p className="text-sm">Selecione uma análise para ver os detalhes</p>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DefenseAnalysisHistory;
