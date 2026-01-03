
import { FormData } from '../types';

/**
 * INSTRUÇÕES:
 * 1. Siga o passo a passo para criar o Web App no Google Apps Script.
 * 2. Cole a URL gerada na constante abaixo.
 */
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyfve4viCJjZsl1iG8VZSZi1myUfcCXm23PzlLGTYJyVDNkLETL7196t-ohtIMrUccC/exec';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const sendData = async (formData: FormData): Promise<void> => {
  // Added comment to fix unintentional comparison error.
  // We only check if GOOGLE_SCRIPT_URL is present since it has already been configured.
  if (!GOOGLE_SCRIPT_URL) {
    throw new Error('Configuração pendente: Insira a URL do Google Apps Script no arquivo services/apiService.ts');
  }

  try {
    const imagePromises = formData.images.map(fileToBase64);
    const base64Images = await Promise.all(imagePromises);

    const payload = {
      workOrderNumber: formData.workOrderNumber,
      workType: formData.workType,
      collaborators: formData.collaborators,
      laborItems: formData.laborItems.map(item => ({
        code: item.code,
        quantity: item.quantity,
        actionType: item.actionType,
      })),
      images: base64Images,
    };

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', // Google Apps Script Web App exige no-cors para envios simples
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    // Como o modo 'no-cors' não permite ler o corpo da resposta por segurança,
    // assumimos sucesso se a requisição não disparar um erro de rede.
    // Em um cenário real com CORS habilitado via proxy ou servidor Vercel,
    // poderíamos verificar response.ok.
    
    return;
  } catch (error) {
    console.error('Erro no envio:', error);
    throw new Error('Erro ao conectar com a planilha. Verifique sua conexão ou a URL do Script.');
  }
};
