import { createContext, useContext, useState } from 'react';

const PropertyContext = createContext(null);

/**
 * Provider que mantém o property_id selecionado.
 * Por ora, o sistema suporta 1 imóvel — carrega o primeiro disponível.
 * Quando multi-property for implementado, basta expandir aqui.
 */
export const PropertyProvider = ({ children }) => {
  const [propertyId, setPropertyId] = useState(1);

  // Futuramente: carregar do backend/settings
  // useEffect(() => { ... }, []);

  return (
    <PropertyContext.Provider value={{ propertyId, setPropertyId }}>
      {children}
    </PropertyContext.Provider>
  );
};

/**
 * Hook para acessar o property_id em qualquer componente.
 * Retorna { propertyId, setPropertyId }
 */
export const usePropertyId = () => {
  const context = useContext(PropertyContext);
  if (!context) {
    // Fallback seguro caso usado fora do provider
    return { propertyId: 1, setPropertyId: () => {} };
  }
  return context;
};

export default PropertyContext;
