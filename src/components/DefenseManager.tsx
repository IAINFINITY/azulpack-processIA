
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, BarChart3 } from "lucide-react";
import { Processo } from "@/types";
import DefenseGenerator from "./DefenseGenerator";
import DefenseAnalyzer from "./DefenseAnalyzer";

interface DefenseManagerProps {
  processo: Processo;
  onDefenseUpdated: (defesa: string) => void;
}

const DefenseManager = ({ processo, onDefenseUpdated }: DefenseManagerProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Resumo de Defesa e Sugestão de Abordagem
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="defense" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="defense" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Gerar Defesa
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analisar Defesa
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="defense" className="mt-4">
            <DefenseGenerator 
              processo={processo} 
              onDefenseUpdated={onDefenseUpdated}
            />
          </TabsContent>
          
          <TabsContent value="analysis" className="mt-4">
            <DefenseAnalyzer 
              processo={processo}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DefenseManager;
