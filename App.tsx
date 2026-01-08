
import React, { useState, useCallback, useEffect } from 'react';
import { LaborItemData, FormData, Collaborator } from './types';
import { sendData } from './services/apiService';
import { exportToXLSX } from './utils/xlsx';
import { COLLABORATORS, WorkType, ActionType } from './constants';

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
        // Fix: Explicitly cast Array.from result to File[] to avoid 'unknown' type error in URL.createObjectURL on line 54
        const newFiles = Array.from(e.target.files) as File[];
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
    setLaborItems([{ ...initialLaborItem, id: Date.now() }]);
    const fileInput = document.getElementById('image-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
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
    if (!validateForm()) return;

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

  const inputStyle = "w-full px-4 py-3 bg-[#3f3f3f] text-white border border-transparent rounded-lg focus:ring-2 focus:ring-primary outline-none transition duration-200 placeholder-gray-400";

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col items-center p-4 sm:p-6 lg:p-8 font-sans">
      {notification && (
        <div className={`fixed top-5 right-5 z-50 p-4 rounded-lg shadow-lg text-white transition-all transform duration-300 ${notification.type === 'success' ? 'bg-secondary' : 'bg-red-500'}`}>
          {notification.message}
        </div>
      )}
      
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-xl overflow-hidden">
        <header className="bg-primary p-6 flex justify-center items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-wide text-center uppercase">
            Relatório de Execução de Serviço
          </h1>
        </header>

        <main className="p-6 sm:p-10 space-y-10">
          {/* CAMPO NÚMERO DA OBRA */}
          <div className="space-y-4">
            <label htmlFor="workOrderNumber" className="block text-lg font-bold text-dark">
              Qual o número da Obra ou Ordem de Serviço?
            </label>
            <input
              id="workOrderNumber"
              type="text"
              value={workOrderNumber}
              onChange={(e) => setWorkOrderNumber(e.target.value)}
              placeholder="Ex: OS-12345"
              className={inputStyle}
            />
          </div>

          <div className={`transition-all duration-500 ${isFormUnlocked ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <div className="space-y-10">
              
              {/* TIPO DE OBRA */}
              <fieldset className="space-y-4">
                <legend className="text-lg font-bold text-dark">
                  Esta execução é de uma obra de contrato com a Energisa ou particular?
                </legend>
                <div className="flex flex-col sm:flex-row sm:space-x-8 space-y-3 sm:space-y-0">
                  {(Object.values(WorkType)).map(value => (
                    <label key={value} className="flex items-center space-x-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="workType"
                        value={value}
                        checked={workType === value}
                        onChange={(e) => setWorkType(e.target.value as WorkType)}
                        className="h-5 w-5 text-primary border-gray-300 focus:ring-primary"
                      />
                      <span className="text-gray-600 font-medium group-hover:text-primary transition-colors capitalize">
                        {value === 'energisa' ? 'Contrato Com A Energisa' : 'Particular'}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* COLABORADORES */}
              <fieldset className="space-y-4">
                <legend className="text-lg font-bold text-dark">
                  Dentre os colaboradores abaixo marque os que estão envolvidos com a atividade:
                </legend>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {COLLABORATORS.map(name => (
                    <label key={name} className="flex items-center space-x-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={collaborators.includes(name)}
                        onChange={() => handleCollaboratorChange(name)}
                        className="h-5 w-5 text-primary rounded border-gray-300 focus:ring-primary"
                      />
                      <span className="text-gray-600 font-medium group-hover:text-primary transition-colors">{name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* IMAGENS */}
              <div className="space-y-4">
                <label htmlFor="image-upload" className="block text-lg font-bold text-dark">
                  Registre por favor imagem das principais mãos de obras da atividade:
                </label>
                <input
                  id="image-upload"
                  type="file"
                  multiple
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-orange-100 file:text-primary hover:file:bg-orange-200 cursor-pointer"
                />
                 {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 mt-6">
                        {imagePreviews.map((previewUrl, index) => (
                            <div key={index} className="relative group rounded-lg overflow-hidden aspect-square shadow-md border">
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                <button
                                    onClick={() => handleRemoveImage(index)}
                                    className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <span className="text-white font-bold text-xl">X</span>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
              </div>

              {/* DETALHES MÃO DE OBRA */}
              <div className="space-y-6 pt-4">
                <h2 className="text-xl font-bold text-dark border-b-4 border-primary inline-block pb-1 uppercase tracking-tighter">Detalhes da Mão de Obra</h2>
                {laborItems.map((item) => (
                  <div key={item.id} className="p-6 border border-gray-100 rounded-xl bg-gray-50/50 shadow-sm relative space-y-6">
                    {laborItems.length > 1 && (
                      <button
                        onClick={() => removeLaborItem(item.id)}
                        className="absolute top-4 right-4 text-red-400 hover:text-red-600 transition-colors"
                        aria-label="Remover item"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700 uppercase tracking-tight">Qual o código da mão de obra?</label>
                        <input
                          type="text"
                          value={item.code}
                          onChange={(e) => handleLaborItemChange(item.id, 'code', e.target.value)}
                          className={inputStyle}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700 uppercase tracking-tight">Qual a quantidade da mão de obra?</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleLaborItemChange(item.id, 'quantity', parseInt(e.target.value, 10) || 1)}
                          className={inputStyle}
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm font-bold text-gray-700 uppercase tracking-tight">Foi uma instalação ou remoção?</p>
                      <div className="flex space-x-8">
                         {Object.values(ActionType).map(value => (
                          <label key={value} className="flex items-center space-x-3 cursor-pointer group">
                            <input
                              type="radio"
                              name={`actionType-${item.id}`}
                              value={value}
                              checked={item.actionType === value}
                              onChange={() => handleLaborItemChange(item.id, 'actionType', value)}
                              className="h-5 w-5 text-primary focus:ring-primary"
                            />
                            <span className="text-gray-600 font-medium group-hover:text-primary transition-colors capitalize">{value === 'instalacao' ? 'Instalacao' : 'Remocao'}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={addLaborItem}
                  className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 text-primary border-2 border-primary rounded-xl font-bold hover:bg-orange-50 transition duration-200"
                >
                  <span className="text-xl">+</span>
                  <span>Adicionar mais códigos</span>
                </button>
              </div>

              {/* BOTÕES FINAIS */}
              <div className="flex flex-col sm:flex-row justify-end gap-4 pt-10 border-t border-gray-100">
                <button
                  onClick={handleSaveXLSX}
                  className="px-8 py-4 bg-secondary text-white font-bold rounded-xl shadow-lg hover:bg-emerald-600 transition-all active:scale-95 flex items-center justify-center space-x-2"
                >
                  <span>Salvar Relatório em XLSX</span>
                </button>
                <button
                  onClick={handleSubmit}
                  className={`px-8 py-4 font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center ${isLoading ? 'bg-orange-300 cursor-not-allowed text-white' : 'bg-primary text-white hover:bg-orange-700'}`}
                  disabled={isLoading}
                >
                  {isLoading ? 'Enviando...' : 'Enviar Dados e Recomeçar'}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
      <footer className="mt-8 text-gray-400 text-sm">
        © {new Date().getFullYear()} JXA Linha Viva - Todos os direitos reservados.
      </footer>
    </div>
  );
};

export default App;
