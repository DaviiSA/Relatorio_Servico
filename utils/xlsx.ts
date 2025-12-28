
import { FormData, LaborItemData } from '../types';

declare const XLSX: any; // Using XLSX from a CDN, so we declare it as a global

export const exportToXLSX = (formData: FormData): void => {
  const { workOrderNumber, workType, collaborators, images, laborItems } = formData;
  
  const commonData = {
    "Número da Obra/OS": workOrderNumber,
    "Tipo de Obra": workType === 'energisa' ? 'Contrato com a Energisa' : 'Particular',
    "Colaboradores": collaborators.join(', '),
    "Nomes das Imagens": images.length > 0 ? images.map(f => f.name).join(', ') : 'N/A',
  };
  
  let dataToExport: any[] = [];

  if (laborItems.length > 0) {
    // Create a new row for each labor item, repeating the common data
    laborItems.forEach((item: LaborItemData) => {
      dataToExport.push({
        ...commonData,
        "Código Mão de Obra": item.code,
        "Quantidade": item.quantity,
        "Ação": item.actionType === 'instalacao' ? 'Instalação' : 'Remoção',
      });
    });
  } else {
    // If there are no labor items, export just the common data
    dataToExport.push({
      ...commonData,
      "Código Mão de Obra": 'N/A',
      "Quantidade": 'N/A',
      "Ação": 'N/A',
    });
  }

  // Create worksheet and workbook
  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório");

  // Set column widths for better readability
  worksheet['!cols'] = [
    { wch: 20 }, // Número da Obra/OS
    { wch: 25 }, // Tipo de Obra
    { wch: 30 }, // Colaboradores
    { wch: 40 }, // Nomes das Imagens
    { wch: 20 }, // Código Mão de Obra
    { wch: 15 }, // Quantidade
    { wch: 15 }, // Ação
  ];

  // Generate and trigger download
  const fileName = `Relatorio_OS_${workOrderNumber || 'Geral'}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};
