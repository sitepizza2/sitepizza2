import React, { useState, useEffect } from 'react';
import { Product, Category } from '../types';

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (product: Product) => void;
    product: Product | null;
    categories: Category[];
}

export const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, onSave, product, categories }) => {
    const getInitialFormData = (): Omit<Product, 'id' | 'active'> => ({
        name: '',
        description: '',
        categoryId: categories.length > 0 ? categories[0].id : '',
        prices: {},
        imageUrl: '',
        badge: '',
        orderIndex: 0,
    });
    
    const [formData, setFormData] = useState<Omit<Product, 'id' | 'active'>>(getInitialFormData());

    useEffect(() => {
        if (isOpen) {
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
            } else {
                setFormData(getInitialFormData());
            }
        }
    }, [product, isOpen, categories]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalProduct: Product = {
            id: product?.id || '', // ID will be handled by the parent/service
            active: product?.active ?? true,
            ...formData
        };
        onSave(finalProduct);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light">{product ? 'Editar Produto' : 'Novo Produto'}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div className="overflow-y-auto p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1">Nome do Produto *</label>
                            <input name="name" value={formData.name} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" required />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">Descrição *</label>
                            <textarea name="description" value={formData.description} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" rows={3} required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1">Categoria *</label>
                                <select name="categoryId" value={formData.categoryId} onChange={handleChange} className="w-full px-3 py-2 border rounded-md bg-white" required>
                                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <label htmlFor="badge-input" className="block text-sm font-semibold">Selo de Destaque (opcional)</label>
                                    <div className="relative group flex items-center">
                                        <button type="button" tabIndex={0} className="w-5 h-5 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-xs font-bold cursor-help focus:outline-none focus:ring-2 focus:ring-accent">
                                            ?
                                        </button>
                                        <div role="tooltip" className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg z-10
                                            opacity-0 invisible pointer-events-none 
                                            group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto
                                            group-focus-within:opacity-100 group-focus-within:visible group-focus-within:pointer-events-auto
                                            transition-all duration-200 ease-in-out transform scale-95 group-hover:scale-100 group-focus-within:scale-100">
                                            
                                            Use selos para destacar produtos no cardápio. Eles aparecem como uma pequena etiqueta sobre a imagem do item.
                                            <br/><br/>
                                            <strong className="font-bold">Exemplos:</strong> "Popular", "Novo", "Promoção", "Mais Vendido".
                                            
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-[6px] border-t-gray-800"></div>
                                        </div>
                                    </div>
                                </div>
                                <input id="badge-input" name="badge" value={formData.badge} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" placeholder="Ex: Popular" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">URL da Imagem</label>
                            <input name="imageUrl" value={formData.imageUrl} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" placeholder="https://picsum.photos/seed/.../400/300" />
                            <p className="text-xs text-gray-500 mt-1">Use um serviço como picsum.photos ou coloque a imagem na sua pasta `assets/` e use `assets/nome.webp`</p>
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
                            <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Cancelar</button>
                            <button type="submit" className="bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90"><i className="fas fa-save mr-2"></i>Salvar Produto</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};