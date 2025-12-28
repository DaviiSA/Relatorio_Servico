
import React, { useState, useCallback, useEffect } from 'react';
import { LaborItemData, FormData, Collaborator } from './types';
import { sendData } from './services/googleSheetsService';
import { exportToXLSX } from './utils/xlsx';
import { COLLABORATORS, WorkType, ActionType } from './constants';
import { logoBase64 } from './assets/logo';

const initialLaborItem: LaborItemData = {
  id: Date.now(),
  code: '',
  quantity: 1,
  actionType: ActionType.INSTALACAO,
};

const App: React.FC = () => {
  const [workOrderNumber, setWorkOrderNumber] = useState('');
  const [workType, setWorkType] = useState<WorkType | ''>('');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [laborItems, setLaborItems] = useState<LaborItemData[]>([initialLaborItem]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const isFormUnlocked = workOrderNumber.trim() !== '';

  useEffect(() => {
    return () => {
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  const handleCollaboratorChange = (collaborator: Collaborator) => {
    setCollaborators(prev =>
      prev.includes(collaborator)
        ? prev.filter(c => c !== collaborator)
        : [...prev, collaborator]
    );
  };

  const handleLaborItemChange = (id: number, field: keyof Omit<LaborItemData, 'id'>, value: string | number | ActionType) => {
    setLaborItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        const newFiles = Array.from(e.target.files);
        setImages(prevImages => [...prevImages, ...newFiles]);

        const newPreviews = newFiles.map(file => URL.createObjectURL(file));
        setImagePreviews(prevPreviews => [...prevPreviews, ...newPreviews]);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    URL.revokeObjectURL(imagePreviews[indexToRemove]);

    setImages(prevImages => prevImages.filter((_, index) => index !== indexToRemove));
    setImagePreviews(prevPreviews => prevPreviews.filter((_, index) => index !== indexToRemove));
  };

  const addLaborItem = () => {
    setLaborItems(prev => [
      ...prev,
      {
        id: Date.now(),
        code: '',
        quantity: 1,
        actionType: ActionType.INSTALACAO,
      },
    ]);
  };
  
  const removeLaborItem = (id: number) => {
    setLaborItems(prev => prev.filter(item => item.id !== id));
  };
  
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const resetForm = useCallback(() => {
    setWorkOrderNumber('');
    setWorkType('');
    setCollaborators([]);
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    setImages([]);
    setImagePreviews([]);
    setLaborItems([initialLaborItem]);
    const fileInput = document.getElementById('image-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }, [imagePreviews]);

  const validateForm = (): boolean => {
      if (!workType) {
          showNotification('Por favor, selecione o tipo de obra.', 'error');
          return false;
      }
      if (collaborators.length === 0) {
          showNotification('Por favor, selecione pelo menos um colaborador.', 'error');
          return false;
      }
      const isAnyLaborCodeEmpty = laborItems.some(item => item.code.trim() === '');
      if (isAnyLaborCodeEmpty) {
          showNotification('Por favor, preencha o código para todos os itens de mão de obra.', 'error');
          return false;
      }
      return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
        return;
    }

    const formData: FormData = {
      workOrderNumber,
      workType,
      collaborators,
      images,
      laborItems,
    };
    
    setIsLoading(true);
    try {
      await sendData(formData);
      showNotification('Dados enviados com sucesso!', 'success');
      resetForm();
    } catch (error) {
      console.error('Failed to send data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar dados. Tente novamente.';
      showNotification(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSaveXLSX = () => {
    if(!isFormUnlocked) {
        showNotification('Preencha o número da obra para gerar o relatório.', 'error');
        return;
    }
    const formData: FormData = {
      workOrderNumber,
      workType,
      collaborators,
      images,
      laborItems,
    };
    try {
      exportToXLSX(formData);
      showNotification('Relatório XLSX gerado com sucesso!', 'success');
    } catch (error) {
       console.error('Failed to generate XLSX:', error);
       showNotification('Erro ao gerar o relatório XLSX.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      {notification && (
        <div className={`fixed top-5 right-5 p-4 rounded-lg shadow-lg text-white ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {notification.message}
        </div>
      )}
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden">
        <header className="bg-primary p-4 flex items-center space-x-4">
          <img src={logoBase64} alt="JXA Linha Viva Logo" className="h-16 w-auto" />
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">
            Relatório de Execução de Serviço
          </h1>
        </header>

        <main className="p-6 sm:p-8 space-y-8">
          <div className="space-y-2">
            <label htmlFor="workOrderNumber" className="block text-lg font-semibold text-dark">
              Qual o número da Obra ou Ordem de Serviço?
            </label>
            <input
              id="workOrderNumber"
              type="text"
              value={workOrderNumber}
              onChange={(e) => setWorkOrderNumber(e.target.value)}
              placeholder="Ex: OS-12345"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition duration-200"
            />
          </div>

          <div className={`transition-opacity duration-500 ${isFormUnlocked ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            <div className="space-y-8">
              <fieldset className="space-y-3">
                <legend className="text-lg font-semibold text-dark">
                  Esta execução é de uma obra de contrato com a Energisa ou particular?
                </legend>
                <div className="flex flex-col sm:flex-row sm:space-x-6 space-y-2 sm:space-y-0">
                  {(Object.values(WorkType)).map(value => (
                    <label key={value} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="workType"
                        value={value}
                        checked={workType === value}
                        onChange={(e) => setWorkType(e.target.value as WorkType)}
                        className="h-5 w-5 text-primary focus:ring-primary"
                        disabled={!isFormUnlocked}
                      />
                      <span className="text-gray-700 text-base capitalize">{value === 'energisa' ? 'Contrato com a Energisa' : value}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="text-lg font-semibold text-dark">
                  Dentre os colaboradores abaixo marque os que estão envolvidos com a atividade:
                </legend>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {COLLABORATORS.map(name => (
                    <label key={name} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={collaborators.includes(name)}
                        onChange={() => handleCollaboratorChange(name)}
                        className="h-5 w-5 text-primary rounded focus:ring-primary"
                        disabled={!isFormUnlocked}
                      />
                      <span className="text-gray-700 text-base">{name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="space-y-2">
                <label htmlFor="image-upload" className="block text-lg font-semibold text-dark">
                  Registre por favor imagem das principais mãos de obras da atividade:
                </label>
                <input
                  id="image-upload"
                  type="file"
                  multiple
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-primary hover:file:bg-orange-100 cursor-pointer"
                  disabled={!isFormUnlocked}
                />
                 {imagePreviews.length > 0 && (
                    <div className="mt-4">
                        <h3 className="text-md font-semibold text-dark">Pré-visualização das Imagens:</h3>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 mt-2">
                            {imagePreviews.map((previewUrl, index) => (
                                <div key={index} className="relative group">
                                    <img src={previewUrl} alt={`Pré-visualização ${index + 1}`} className="w-full h-24 object-cover rounded-lg shadow-md" />
                                    <button
                                        onClick={() => handleRemoveImage(index)}
                                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full h-6 w-6 flex items-center justify-center text-lg opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                                        aria-label="Remover imagem"
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
              </div>

              <div className="space-y-6">
                 <h2 className="text-xl font-bold text-dark border-b-2 border-primary pb-2">Detalhes da Mão de Obra</h2>
                {laborItems.map((item, index) => (
                  <div key={item.id} className="p-4 border rounded-lg bg-gray-50 relative">
                     {laborItems.length > 1 && (
                      <button
                        onClick={() => removeLaborItem(item.id)}
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                        aria-label="Remover item"
                        disabled={!isFormUnlocked}
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor={`laborCode-${item.id}`} className="block text-base font-medium text-gray-700">
                          Qual o código da mão de obra?
                        </label>
                        <input
                          id={`laborCode-${item.id}`}
                          type="text"
                          value={item.code}
                          onChange={(e) => handleLaborItemChange(item.id, 'code', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary"
                          disabled={!isFormUnlocked}
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor={`laborQuantity-${item.id}`} className="block text-base font-medium text-gray-700">
                          Qual a quantidade da mão de obra?
                        </label>
                        <input
                          id={`laborQuantity-${item.id}`}
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleLaborItemChange(item.id, 'quantity', parseInt(e.target.value, 10) || 1)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary"
                          disabled={!isFormUnlocked}
                        />
                      </div>
                      <fieldset className="md:col-span-2 space-y-2">
                        <legend className="text-base font-medium text-gray-700">Foi uma instalação ou remoção?</legend>
                        <div className="flex space-x-4">
                           {Object.values(ActionType).map(value => (
                            <label key={value} className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`actionType-${item.id}`}
                                value={value}
                                checked={item.actionType === value}
                                onChange={() => handleLaborItemChange(item.id, 'actionType', value)}
                                className="h-4 w-4 text-primary focus:ring-primary"
                                disabled={!isFormUnlocked}
                              />
                              <span className="text-gray-700 capitalize">{value}</span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    </div>
                  </div>
                ))}
                <button
                  onClick={addLaborItem}
                  className="flex items-center space-x-2 px-4 py-2 text-primary border-2 border-primary rounded-lg hover:bg-orange-50 transition duration-200 disabled:opacity-50"
                  disabled={!isFormUnlocked}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>
                  <span>Adicionar mais códigos</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t">
                <button
                  onClick={handleSaveXLSX}
                  className="px-6 py-3 bg-secondary text-white font-bold rounded-lg shadow-md hover:bg-green-600 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!isFormUnlocked}
                >
                  Salvar Relatório em XLSX
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-6 py-3 bg-primary text-white font-bold rounded-lg shadow-md hover:bg-orange-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!isFormUnlocked || isLoading}
                >
                  {isLoading ? 'Enviando...' : 'Enviar Dados e Recomeçar'}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
