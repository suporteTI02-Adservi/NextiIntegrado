import { invoke } from "@tauri-apps/api/core";

export type ReportType = "AFASTAMENTOS" | "CTPS" | "HOLERITE" | "COMPROVANTE_BANCARIO" | "CTPS_DIGITAL";

export class SoapService {
  /**
   * Gera o relatório via SOAP dependendo do tipo solicitado.
   * Retorna um objeto contendo o Blob do PDF gerado.
   */
  async getReport(type: ReportType, usuario: string, senha: string, matricula: string): Promise<Blob> {
    if (!matricula || matricula.length === 0) {
      throw new Error("Matrícula é obrigatória.");
    }

    const empresa = matricula.charAt(0);
    
    let prRelatorio = "";
    let prEntradaInner = "";

    if (type === "AFASTAMENTOS") {
      prRelatorio = "FPHI009.COL";
      prEntradaInner = `<EDatIni=01/01/2000><EDatRef=31/12/2050><ETerAfa=T><ESpNivTot=00><ESpNivQue=00><EMosUsu=N><ELisDem=S><EAbrEmp=${empresa}><EAbrCad=${matricula}>`;
    } else if (type === "CTPS") {
      prRelatorio = "FPFR202.COL";
      prEntradaInner = `<ELisCol=3><EDatIni=01/01/2000><EDatRef=31/12/2050><EIniSit=01/01/2000><EFimSit=31/12/2050><EAbrEmp=${empresa}><EAbrCad=${matricula}>`;
    } else if (type === "COMPROVANTE_BANCARIO") {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const todayStr = `${day}/${month}/${year}`;
      
      prRelatorio = "FPDO501.COL"; // FPDO501 was generating Comprovante Bancário
      prEntradaInner = `<EDatRef=${todayStr}><EAbrEmp=${empresa}><EAbrCad=${matricula}><EGerArq=N>`;
    } else if (type === "CTPS_DIGITAL") {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const todayStr = `${day}/${month}/${year}`;
      
      prRelatorio = "FPDO504.COL";
      prEntradaInner = `<EDatRef=${todayStr}><EAbrEmp=${empresa}><EAbrCad=${matricula}><EGerArq=N>`;
    }

    // Usa CDATA para não precisar escapar os caracteres < e >
    const prEntrada = `<![CDATA[${prEntradaInner}]]>`;

    const xmlPayload = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://services.senior.com.br">
  <soapenv:Body>
    <ser:Relatorios>
      <user>${usuario}</user>
      <password>${senha}</password>
      <encryption>0</encryption>
      <parameters>
        <prPrintDest></prPrintDest>
        <prRemetente></prRemetente>
        <prDir></prDir>
        <prExecFmt>tefFile</prExecFmt>
        <prDest></prDest>
        <prFileName>teste</prFileName>
        <prRelatorio>${prRelatorio}</prRelatorio>
        <prCC></prCC>
        <prFileExt>tefFile</prFileExt>
        <prEntrada>${prEntrada}</prEntrada>
        <prCCo></prCCo>
        <prUniqueFile>N</prUniqueFile>
        <prOrder></prOrder>
        <prAssunto></prAssunto>
        <prTypeBmp></prTypeBmp>
        <prRetorno></prRetorno>
        <prMensagem></prMensagem>
        <prFileLayout></prFileLayout>
        <prLOG></prLOG>
        <prAnexoBool></prAnexoBool>
        <prLayoutEXCEL></prLayoutEXCEL>
        <prLayoutSAGA></prLayoutSAGA>
        <prSaveFormat>tsfPDF</prSaveFormat>
        <prEntranceIsXML>F</prEntranceIsXML>
      </parameters>
    </ser:Relatorios>
  </soapenv:Body>
</soapenv:Envelope>`;

    try {
      // Chama o comando em Rust que fará o POST HTTP para o endpoint SOAP
      const responseXml: string = await invoke("generate_soap_report", {
        xmlPayload: xmlPayload,
      });

      // Busca o valor da tag prRetorno usando [\s\S] para capturar quebras de linha no Base64
      const prRetornoMatch = responseXml.match(/<prRetorno>([\s\S]*?)<\/prRetorno>/);
      
      if (!prRetornoMatch || !prRetornoMatch[1]) {
        // Verifica erroExecucao
        const erroMatch = responseXml.match(/<erroExecucao[^>]*>([\s\S]*?)<\/erroExecucao>/);
        if (erroMatch && erroMatch[1] && erroMatch[1].trim().length > 0) {
          throw new Error(`Erro de execução no Senior para o relatório ${type}: ${erroMatch[1].trim()}`);
        }

        // Verifica se há alguma mensagem de erro do Senior
        const mensagemMatch = responseXml.match(/<prMensagem>([\s\S]*?)<\/prMensagem>/);
        if (mensagemMatch && mensagemMatch[1]) {
          throw new Error(`Erro do servidor no relatório ${type}: ${mensagemMatch[1]}`);
        }
        
        throw new Error(`Não foi possível encontrar o relatório ${type} na resposta do servidor. Resposta bruta: ${responseXml.substring(0, 500)}`);
      }

      // Remove quebras de linha e espaços da string base64, que podem vir no XML
      const base64Data = prRetornoMatch[1].replace(/[\r\n\s]+/g, "");
      
      // Converte o base64 para Blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });

      return blob;
    } catch (error: any) {
      console.error(`Erro no SoapService (${type}):`, error);
      throw new Error(error.message || `Erro ao conectar ao serviço para o relatório ${type}.`);
    }
  }

  /**
   * Busca o holerite (FPEN104.ENV) de um colaborador para um mês/ano específico.
   * Retorna o Blob do PDF e o base64 bruto para persistência em disco.
   */
  async getHolerite(
    usuario: string,
    senha: string,
    matricula: string,
    isDecimoTerceiro: boolean = false
  ): Promise<{ blob: Blob; base64: string }> {
    if (!matricula || matricula.length === 0) {
      throw new Error("Matrícula é obrigatória.");
    }

    const empresa = matricula.charAt(0);

    // Faixa ampla de datas para buscar todo o histórico de holerites em um único PDF (conforme arquivo TODO)
    const primeiroDia = "01/01/2000";
    const ultimoDia = "31/12/2050";
    
    const tipoCalculo = isDecimoTerceiro ? "31-32" : "11-23,41-94";

    const prEntradaInner = `<EIncOca=S><EMosBat=A><EMarPon=N><ETruMar=N><ETruLim=N><EIniPerCal=${primeiroDia}><EFimPerCal=${ultimoDia}><EAbrTipCal=${tipoCalculo}><EAbrEmp=${empresa}><EAbrTcl=1><EAbrCad=${matricula}>`;
    const prEntrada = `<![CDATA[${prEntradaInner}]]>`;

    const xmlPayload = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://services.senior.com.br">
  <soapenv:Body>
    <ser:Relatorios>
      <user>${usuario}</user>
      <password>${senha}</password>
      <encryption>0</encryption>
      <parameters>
        <prPrintDest></prPrintDest>
        <prRemetente></prRemetente>
        <prDir></prDir>
        <prExecFmt>tefFile</prExecFmt>
        <prDest></prDest>
        <prFileName>teste</prFileName>
        <prRelatorio>FPEN104.ENV</prRelatorio>
        <prCC></prCC>
        <prFileExt>tefFile</prFileExt>
        <prEntrada>${prEntrada}</prEntrada>
        <prCCo></prCCo>
        <prUniqueFile>N</prUniqueFile>
        <prOrder></prOrder>
        <prAssunto></prAssunto>
        <prTypeBmp></prTypeBmp>
        <prRetorno></prRetorno>
        <prMensagem></prMensagem>
        <prFileLayout></prFileLayout>
        <prLOG></prLOG>
        <prAnexoBool></prAnexoBool>
        <prLayoutEXCEL></prLayoutEXCEL>
        <prLayoutSAGA></prLayoutSAGA>
        <prSaveFormat>tsfPDF</prSaveFormat>
        <prEntranceIsXML>F</prEntranceIsXML>
      </parameters>
    </ser:Relatorios>
  </soapenv:Body>
</soapenv:Envelope>`;

    try {
      const responseXml: string = await invoke("generate_soap_report", {
        xmlPayload: xmlPayload,
      });

      // Verifica erroExecucao
      const erroMatch = responseXml.match(/<erroExecucao[^>]*>([\s\S]*?)<\/erroExecucao>/);
      if (erroMatch && erroMatch[1] && erroMatch[1].trim().length > 0) {
        throw new Error(`Erro na execução do relatório de holerite: ${erroMatch[1].trim()}`);
      }

      const prRetornoMatch = responseXml.match(/<prRetorno>([\s\S]*?)<\/prRetorno>/);
      
      if (!prRetornoMatch || !prRetornoMatch[1]) {
        const mensagemMatch = responseXml.match(/<prMensagem>([\s\S]*?)<\/prMensagem>/);
        if (mensagemMatch && mensagemMatch[1]) {
          throw new Error(`Erro do servidor no holerite: ${mensagemMatch[1]}`);
        }
        throw new Error(`Não foi possível encontrar o holerite na resposta do servidor.`);
      }

      const base64Data = prRetornoMatch[1].replace(/[\r\n\s]+/g, "");
      
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });

      return { blob, base64: base64Data };
    } catch (error: any) {
      console.error(`Erro no SoapService (HOLERITE):`, error);
      throw new Error(error.message || `Erro ao buscar histórico de holerites.`);
    }
  }

  async getColaboradorName(usuario: string, senha: string, matricula: string): Promise<string | null> {
    if (!matricula || matricula.length === 0) return null;
    
    const empresa = matricula.charAt(0);

    const xmlPayload = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://services.senior.com.br">
   <soapenv:Header/>
   <soapenv:Body>
      <ser:ConsultarColaborador>
         <user>${usuario}</user>
         <password>${senha}</password>
         <encryption>0</encryption>
         <parameters>
            <numEmp>${empresa}</numEmp>
             <tipCol>1</tipCol>
             <numCad>${matricula}</numCad>
         </parameters>
      </ser:ConsultarColaborador>
   </soapenv:Body>
</soapenv:Envelope>`;

    try {
      const responseXml: string = await invoke("consult_collaborator_soap", {
        xmlPayload: xmlPayload,
      });

      // Busca por tags comuns de retorno de nome no Senior
      const nameMatch = responseXml.match(/<nomFun>(.*?)<\/nomFun>/i) || 
                        responseXml.match(/<nomCol>(.*?)<\/nomCol>/i) ||
                        responseXml.match(/<nomCad>(.*?)<\/nomCad>/i);
      
      if (nameMatch && nameMatch[1]) {
        return nameMatch[1].trim();
      }
      return null;
    } catch (e) {
      console.error("Erro ao buscar nome do colaborador via SOAP", e);
      return null;
    }
  }
}
