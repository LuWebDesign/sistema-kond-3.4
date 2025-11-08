// promo-engine.js - Motor de promociones para Next.js

// Función para calcular contraste y elegir color de texto automáticamente
export function getContrastColor(hexColor) {
  // Asegurar que el color tiene el formato correcto
  if (!hexColor || hexColor === 'auto') hexColor = '#3b82f6';
  if (!hexColor.startsWith('#')) hexColor = '#' + hexColor;
  
  // Convertir hex a RGB
  const r = parseInt(hexColor.substr(1, 2), 16);
  const g = parseInt(hexColor.substr(3, 2), 16);
  const b = parseInt(hexColor.substr(5, 2), 16);
  
  // Calcular luminosidad (fórmula WCAG)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Si el fondo es claro (luminance > 0.5), usar texto oscuro
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

// Filtrar promociones activas según fecha actual
export function getActivePromotions(allPromos = []) {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    
    return allPromos.filter(promo => {
      if (!promo.activo) return false;
      
      // Validar rango de fechas si están definidas
      if (promo.fechaInicio && promo.fechaInicio > today) return false;
      if (promo.fechaFin && promo.fechaFin < today) return false;
      
      return true;
    });
  } catch (e) {
    console.warn('Error filtrando promociones:', e);
    return [];
  }
}

// Aplicar promociones a un producto específico
export function applyPromotionsToProduct(product, allPromos = []) {
  const activePromos = getActivePromotions(allPromos);
  
  // Filtrar promociones que aplican a este producto
  const applicablePromos = activePromos.filter(promo => {
    // Si aplica a todos los productos
    if (promo.aplicaA === 'todos') return true;
    
    // Si aplica a una categoría específica
    if (promo.aplicaA === 'categoria' && promo.categoria === product.categoria) return true;
    
    // Si aplica a un producto específico
    if (promo.aplicaA === 'producto' && promo.productoId === product.id) return true;
    
    return false;
  });

  // Normalizar datos básicos del producto (soporta keys en ES/EN)
  const normalizedProduct = {
    id: product.id || product.idProducto || product.productId,
    categoria: product.categoria || product.category,
    precioUnitario: product.precioUnitario || product.price || product.unitPrice || 0
  };

  let result = {
    originalPrice: normalizedProduct.precioUnitario,
    discountedPrice: normalizedProduct.precioUnitario,
    hasPromotion: false,
    promotions: [],
    badge: null,
    badgeColor: null,
    badgeTextColor: null,
    badges: [], // Array de todos los badges aplicables
  };

  if (applicablePromos.length === 0) {
    return result;
  }

  result.hasPromotion = true;
  result.promotions = applicablePromos;
  
  // Aplicar promociones de forma prioritaria (mayor prioridad primero)
  const sortedPromos = [...applicablePromos].sort((a, b) => (b.prioridad || 0) - (a.prioridad || 0));
  
  let currentPrice = result.originalPrice;
  
  sortedPromos.forEach(promo => {
    // Recopilar badges
    if (promo.badgeTexto) {
      // Calcular color de texto si es 'auto'
      let textColor = promo.badgeTextColor || 'auto';
      if (textColor === 'auto') {
        textColor = getContrastColor(promo.badgeColor || '#3b82f6');
      }
      
      result.badges.push({
        text: promo.badgeTexto,
        color: promo.badgeColor || '#3b82f6',
        textColor: textColor
      });
      
      // El primer badge (mayor prioridad) se usa como principal
      if (!result.badge) {
        result.badge = promo.badgeTexto;
        result.badgeColor = promo.badgeColor || '#3b82f6';
        result.badgeTextColor = textColor;
      }
    }

    // Aplicar descuentos según tipo
    // Soportar propiedades en español/inglés
    const promoType = promo.type || promo.tipo;
    const perc = promo.descuentoPorcentaje || promo.discountPercentage;
    const fixed = promo.precioEspecial || promo.fixedPrice;

    if (promoType === 'percentage_discount' && typeof perc === 'number') {
      currentPrice = currentPrice * (1 - perc / 100);
    } else if (promoType === 'fixed_price' && typeof fixed === 'number') {
      // Precio fijo: usar el más bajo encontrado
      currentPrice = Math.min(currentPrice, fixed);
    } else if (promoType === 'badge_only') {
      // Solo badge, no afecta el precio
    }
  });

  result.discountedPrice = Math.max(0, currentPrice);

  return result;
}

// Obtener badge de promoción para un producto
export function getPromotionBadge(product, allPromos = []) {
  const promoResult = applyPromotionsToProduct(product, allPromos);
  return promoResult.badge ? {
    text: promoResult.badge,
    color: promoResult.badgeColor,
    textColor: promoResult.badgeTextColor
  } : null;
}

// Calcular precio con descuento
export function calculateDiscountedPrice(product, quantity = 1, allPromos = []) {
  const promoResult = applyPromotionsToProduct(product, allPromos);
  const activePromos = promoResult.promotions || [];
  
  if (activePromos.length === 0) {
    return {
      unitPrice: promoResult.originalPrice,
      totalPrice: promoResult.originalPrice * quantity,
      discount: 0,
      hasDiscount: false
    };
  }

  let unitPrice = promoResult.discountedPrice;
  let totalPrice = unitPrice * quantity;
  let discount = 0;

  // Manejar promociones especiales de cantidad (buy_x_get_y)
  // Solo se aplica una promoción de este tipo (la primera encontrada)
  // Soportar keys en ES/EN para tipo/config
  const buyXgetYPromo = activePromos.find(p => (p.type || p.tipo) === 'buy_x_get_y');
  if (buyXgetYPromo) {
    const cfg = buyXgetYPromo.config || buyXgetYPromo.configuracion || {};
    const buyQty = cfg.buyQuantity || cfg.buy || cfg.buyQty || 2;
    const payQty = cfg.payQuantity || cfg.pay || cfg.payQty || 1;
    
    if (quantity >= buyQty) {
      const groups = Math.floor(quantity / buyQty);
      const remaining = quantity % buyQty;
      totalPrice = (groups * payQty + remaining) * promoResult.originalPrice;
      discount = promoResult.originalPrice * quantity - totalPrice;
    }
  } else {
    // Descuentos acumulativos ya aplicados en applyPromotionsToProduct
    discount = (promoResult.originalPrice - unitPrice) * quantity;
  }

  return {
    unitPrice,
    totalPrice,
    discount,
    hasDiscount: discount > 0,
    promotions: activePromos // Devolver todas las promociones aplicadas
  };
}

// Aplicar promociones a todo el carrito
export function applyPromotionsToCart(cartItems, allPromos = []) {
  // Obtener promos activas a partir de la lista completa pasada
  const activePromos = getActivePromotions(allPromos);
  let cartTotal = 0;
  let totalDiscount = 0;
  let appliedPromotions = [];
  let freeShipping = false;

  const processedItems = cartItems.map(item => {
    const product = {
      id: item.idProducto || item.productId || item.id,
      categoria: item.categoria || item.category,
      precioUnitario: item.price || item.precioUnitario || item.unitPrice || 0
    };
    const pricing = calculateDiscountedPrice(product, item.quantity, activePromos);
    
    cartTotal += pricing.totalPrice;
    totalDiscount += pricing.discount;
    
    if (pricing.hasDiscount && pricing.promotions) {
      // Añadir todas las promociones aplicadas a este item
      pricing.promotions.forEach(promo => {
        if (!appliedPromotions.find(p => p.id === promo.id)) {
          appliedPromotions.push(promo);
        }
      });
    }

    return {
      ...item,
      originalUnitPrice: item.price,
      effectiveUnitPrice: pricing.unitPrice,
      effectiveTotalPrice: pricing.totalPrice,
      itemDiscount: pricing.discount,
      hasDiscount: pricing.hasDiscount,
      appliedPromotions: pricing.promotions || []
    };
  });

  // Verificar envío gratis (pueden aplicarse múltiples promos de envío)
  const shippingPromos = activePromos.filter(p => (p.type || p.tipo) === 'free_shipping');
  for (const promo of shippingPromos) {
    const cfg = promo.config || promo.configuracion || {};
    const minAmount = cfg.minAmount || cfg.min || 0;
    if (cartTotal >= minAmount) {
      freeShipping = true;
      if (!appliedPromotions.find(p => p.id === promo.id)) {
        appliedPromotions.push(promo);
      }
      break; // Una es suficiente para envío gratis
    }
  }

  return {
    items: processedItems,
    subtotal: cartTotal,
    totalDiscount,
    freeShipping,
    appliedPromotions: appliedPromotions,
    finalTotal: cartTotal,
    promotionsSummary: generatePromotionsSummary(appliedPromotions, totalDiscount)
  };
}

// Generar resumen de promociones aplicadas
function generatePromotionsSummary(promotions, totalDiscount) {
  if (promotions.length === 0) return null;
  
  return {
    count: promotions.length,
    titles: promotions.map(p => p.title).join(', '),
    totalSaved: totalDiscount
  };
}

// Exportar todas las funciones como objeto para compatibilidad
const PromoEngine = {
  getActivePromotions,
  applyPromotionsToProduct,
  applyPromotionsToCart,
  calculateDiscountedPrice,
  getPromotionBadge,
  getContrastColor
};

export default PromoEngine;
