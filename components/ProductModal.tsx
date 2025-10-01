import React, { useState, useEffect, useRef } from 'react';
import { Product, Category } from '../types';
import * as firebaseService from '../services/firebaseService';
import { CameraModal } from './CameraModal';
import { GoogleGenAI } from '@google/genai';

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (product: Product) => Promise<void>;
    product: Product | null;
    categories: Category[];
    addToast: (message: string, type?: 'success' | 'error') => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, onSave, product, categories, addToast }) => {
    const getInitialFormData = (): Omit<Product, 'id' | 'active'> => ({
        name: '',
        description: '',
        categoryId: categories.length > 0 ? categories[0].id : '',
        prices: {},
        imageUrl: '',
        badge: '',
        orderIndex: 0,
    });
    
    const [formData, setFormData] = useState(getInitialFormData());
    const [showBadgeTooltip, setShowBadgeTooltip] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setImageFile(null); // Reset file on open
            if (product) {
                setFormData({
                    name: product.name,
                    description: product.description,
                    categoryId: product.categoryId,
                    prices: product.prices,
                    imageUrl: product.imageUrl,
                    badge: product.badge || '',
                    orderIndex: product.orderIndex,
                });
                setImagePreview(product.imageUrl);
            } else {
                setFormData(getInitialFormData());
                setImagePreview('');
            }
        }
    }, [product, isOpen, categories]);

    useEffect(() => {
        if (!imageFile) return;
        const objectUrl = URL.createObjectURL(imageFile);
        setImagePreview(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [imageFile]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleChange(e);
        if (imageFile) setImageFile(null);
        setImagePreview(e.target.value);
    };
    
    const handlePriceChange = (size: string, value: string) => {
        const newPrices = { ...formData.prices };
        if (value) {
            newPrices[size] = parseFloat(value);
        } else {
            delete newPrices[size];
        }
        setFormData({ ...formData, prices: newPrices });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0]);
            setFormData(prev => ({ ...prev, imageUrl: '' }));
        }
    };
    
    const handleCapture = (file: File) => {
        setImageFile(file);
        setFormData(prev => ({ ...prev, imageUrl: '' }));
        setIsCameraOpen(false);
    };
    
    const handleGenerateDescription = async () => {
        setIsGeneratingDescription(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const categoryName = categories.find(c => c.id === formData.categoryId)?.name || 'geral';
            
            const prompt = `Crie uma descrição de produto curta, apetitosa e envolvente para um item de cardápio chamado "${formData.name}". Este item pertence à categoria "${categoryName}". A descrição deve ser em português do Brasil, ter no máximo 150 caracteres e não deve incluir o nome do produto. Foque nos ingredientes e na sensação de saboreá-lo.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            let description = response.text.trim();
            // Remove potential wrapping quotes from the AI response
            if ((description.startsWith('"') && description.endsWith('"')) || (description.startsWith("'") && description.endsWith("'"))) {
                description = description.substring(1, description.length - 1);
            }
            
            setFormData({ ...formData, description });
            addToast("Descrição gerada com sucesso!", 'success');

        } catch (error) {
            console.error("Error generating description:", error);
            addToast("Falha ao gerar descrição com IA. Tente novamente.", 'error');
        } finally {
            setIsGeneratingDescription(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUploading(true);
        try {
            let finalImageUrl = formData.imageUrl;
            if (imageFile) {
                finalImageUrl = await firebaseService.uploadImage(imageFile);
            }

            const finalProduct: Product = {
                id: product?.id || '',
                active: product?.active ?? true,
                ...formData,
                imageUrl: finalImageUrl,
            };
            await onSave(finalProduct);
            onClose();
        } catch (error) {
            console.error("Erro ao salvar produto:", error);
            alert("Falha ao enviar a imagem ou salvar o produto. Tente novamente.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                    <div className="flex justify-between items-center p-5 border-b border-gray-200">
                        <h2 className="text-2xl font-bold text-text-on-light">{product ? 'Editar Produto' : 'Novo Produto'}</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl" disabled={isUploading}>&times;</button>
                    </div>
                    <div className="overflow-y-auto p-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1">Nome do Produto *</label>
                                <input name="name" value={formData.name} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" required />
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-sm font-semibold">Descrição *</label>
                                    <button 
                                        type="button" 
                                        onClick={handleGenerateDescription} 
                                        disabled={!formData.name || isGeneratingDescription} 
                                        className="text-xs bg-accent/20 text-accent font-semibold py-1 px-2 rounded-md hover:bg-accent/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
                                    >
                                        {isGeneratingDescription ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>}
                                        <span>Gerar com IA</span>
                                    </button>
                                </div>
                                <textarea name="description" value={formData.description} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" rows={3} required />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-1">Categoria *</label>
                                    <select name="categoryId" value={formData.categoryId} onChange={handleChange} className="w-full px-3 py-2 border rounded-md bg-white" required>
                                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                    </select>
                                </div>
                                <div className="relative">
                                    <div className="flex items-center gap-2 mb-1">
                                        <label className="block text-sm font-semibold">Selo de Destaque (opcional)</label>
                                        <button type="button" onMouseEnter={() => setShowBadgeTooltip(true)} onMouseLeave={() => setShowBadgeTooltip(false)} onClick={() => setShowBadgeTooltip(!showBadgeTooltip)} className="text-gray-400 hover:text-gray-600 focus:outline-none" aria-label="Informações sobre o selo de destaque"><i className="fas fa-question-circle"></i></button>
                                    </div>
                                    {showBadgeTooltip && (
                                        <div style={{ animation: 'fadeInUp 0.2s ease-out' }} className="absolute bottom-full left-0 mb-2 w-full max-w-xs bg-gray-800 text-white text-sm rounded-lg p-3 z-10 shadow-lg">
                                            <p>Um selo para destacar o produto no cardápio. Aparecerá como uma pequena etiqueta na imagem.</p>
                                            <p className="mt-1 font-semibold">Exemplos: 'Popular', 'Novo', 'Promoção'.</p>
                                            <div className="absolute left-4 -bottom-1 w-2 h-2 bg-gray-800 rotate-45"></div>
                                        </div>
                                    )}
                                    <input name="badge" value={formData.badge} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" placeholder="Ex: Novo, Popular" />
                                </div>
                            </div>
                             <div>
                                <label className="block text-sm font-semibold mb-1">Imagem do Produto</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center border overflow-hidden">
                                        {imagePreview ? <img src={imagePreview} alt="Prévia" className="w-full h-full object-cover" /> : <i className="fas fa-image text-3xl text-gray-300"></i>}
                                    </div>
                                    <div className="flex-grow space-y-2">
                                        <input name="imageUrl" value={formData.imageUrl} onChange={handleUrlChange} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Ou cole uma URL aqui" />
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 text-sm bg-gray-200 text-gray-800 font-semibold py-2 px-3 rounded-lg hover:bg-gray-300"><i className="fas fa-upload mr-2"></i>Enviar Arquivo</button>
                                            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                                            <button type="button" onClick={() => setIsCameraOpen(true)} className="flex-1 text-sm bg-gray-200 text-gray-800 font-semibold py-2 px-3 rounded-lg hover:bg-gray-300"><i className="fas fa-camera mr-2"></i>Usar Câmera</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Preços *</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-md border">
                                    {['P', 'M', 'G', 'Única'].map(size => (
                                        <div key={size}>
                                            <label className="block text-xs font-medium mb-1">{size}</label>
                                            <input type="number" step="0.01" value={formData.prices[size] || ''} onChange={e => handlePriceChange(size, e.target.value)} className="w-full px-2 py-1 border rounded-md" placeholder="0.00"/>
                                        </div>
                                    ))}
                                </div>
                                 <p className="text-xs text-gray-500 mt-1">Deixe o campo em branco para tamanhos não aplicáveis.</p>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={onClose} disabled={isUploading} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 disabled:opacity-50">Cancelar</button>
                                <button type="submit" disabled={isUploading} className="bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 flex items-center justify-center min-w-[150px] disabled:bg-opacity-70">
                                    {isUploading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-save mr-2"></i><span>Salvar Produto</span></>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            {isCameraOpen && <CameraModal onCapture={handleCapture} onClose={() => setIsCameraOpen(false)} />}
        </>
    );
};