
import { FormData } from '../types';

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz_YfF2T5hfjl915N5BiTB55l2xtE1nITW0F5FZysPCe3reh7EG-hztCvzlNHI3HUTf/exec';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const sendData = async (formData: FormData): Promise<void> => {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('COLE_AQUI')) {
    throw new Error('Configuração pendente: A URL do Google Script não foi configurada corretamente.');
  }

  try {
    // Converte imagens para base64
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

    // Usamos 'no-cors' para evitar o erro de redirecionamento do Google Apps Script.
    // O conteúdo é enviado como text/plain para simplificar a requisição.
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    // Nota: Em 'no-cors', não conseguimos ler a resposta do servidor.
    // Se a função fetch não disparar um erro, consideramos que o pacote foi enviado.
    return;
  } catch (error) {
    console.error('Erro detalhado no envio:', error);
    throw new Error('Falha na conexão com o servidor da planilha. Verifique sua internet.');
  }
};
