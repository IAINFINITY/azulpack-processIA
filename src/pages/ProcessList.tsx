
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Processo } from "@/types";
import ProcessCard from "@/components/ProcessCard";
import CreateProcessDialog from "@/components/CreateProcessDialog";
import { FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LayoutGrid, List as ListIcon } from "lucide-react";

const ProcessList = ({ search = "" }) => {
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user, logAuditEvent } = useAuth();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>("grid");

  const loadProcessos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('processos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setProcessos(data || []);
      
      // Registrar acesso aos processos
      if (user) {
        await logAuditEvent('VIEW_PROCESS', 'PROCESS');
      }
    } catch (error: any) {
      console.error("Erro ao carregar processos:", error);
      toast({
        title: "Erro ao carregar processos",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProcessos();
  }, []);

  const handleProcessCreated = () => {
    loadProcessos();
  };

  const filteredProcessos = processos.filter((proc) => {
    const text = `${proc.titulo ?? ''} ${proc.numero_processo ?? ''}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Processos Trabalhistas
            </h1>
            <p className="text-muted-foreground">
              Gerencie seus processos e converse com a IA especializada
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-center">
            <ToggleGroup type="single" value={viewMode} onValueChange={v => v && setViewMode(v as 'grid' | 'list')}>
              <ToggleGroupItem value="grid" aria-label="Visualizar em grade">
                <LayoutGrid className="h-5 w-5" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="Visualizar em lista">
                <ListIcon className="h-5 w-5" />
              </ToggleGroupItem>
            </ToggleGroup>
            <CreateProcessDialog onProcessCreated={handleProcessCreated} />
          </div>
        </div>

        {loading ? (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded w-full mb-2"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProcessos.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum processo encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Comece criando seu primeiro processo trabalhista
              </p>
              <CreateProcessDialog onProcessCreated={handleProcessCreated} />
            </CardContent>
          </Card>
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
            {filteredProcessos.map((processo) => (
              <ProcessCard 
                key={processo.id} 
                processo={processo} 
                viewMode={viewMode} 
                onProcessUpdated={handleProcessCreated}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessList;
