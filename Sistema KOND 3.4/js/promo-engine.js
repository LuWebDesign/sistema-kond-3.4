// promo-engine.js - Motor de promociones para aplicar en catálogo
(function() {
  // Hacer disponible globalmente
  window.PromoEngine = {
    getActivePromotions,
    applyPromotionsToProduct,
    applyPromotionsToCart,
    calculateDiscountedPrice,
    getPromotionBadge
  };

  // Función para calcular contraste y elegir color de texto automáticamente
  function getContrastColor(hexColor) {
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

  // Cargar promociones activas
  function getActivePromotions() {
    try {
      const allPromos = JSON.parse(localStorage.getItem('marketing_promotions') || '[]');
      const now = new Date();
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
      
      return allPromos.filter(promo => {
        if (!promo.active) return false;
        
        // Validar rango de fechas si están definidas
        if (promo.start && promo.start > today) return false;
        if (promo.end && promo.end < today) return false;
        
        return true;
      });
    } catch (e) {
      console.warn('Error cargando promociones:', e);
      return [];
    }
  }

  // Aplicar promociones a un producto específico
  function applyPromotionsToProduct(product) {
    const activePromos = getActivePromotions();
    const applicablePromos = activePromos.filter(promo => 
      promo.productIds && promo.productIds.includes(product.id)
    );

    let result = {
      originalPrice: product.precioUnitario || 0,
      discountedPrice: product.precioUnitario || 0,
      hasPromotion: false,
      promotions: [],
      badge: null,
      badgeColor: null,
      badges: [], // Array de todos los badges aplicables
      discountBadgeColor: '#10b981', // Color por defecto del badge de descuento
      discountBadgeTextColor: 'auto' // Color de texto por defecto
    };

    if (applicablePromos.length === 0) {
      return result;
    }

    result.hasPromotion = true;
    result.promotions = applicablePromos;
    
    // Aplicar TODAS las promociones de tipo descuento de forma acumulativa
    let currentPrice = result.originalPrice;
    
    applicablePromos.forEach(promo => {
      // Recopilar badges
      if (promo.badge) {
        // Calcular color de texto si es 'auto'
        let textColor = promo.textColor || 'auto';
        if (textColor === 'auto') {
          textColor = getContrastColor(promo.color || '#3b82f6');
        }
        
        result.badges.push({
          text: promo.badge,
          color: promo.color || '#3b82f6',
          textColor: textColor
        });
        // El primer badge se usa como principal
        if (!result.badge) {
          result.badge = promo.badge;
          result.badgeColor = promo.color || '#3b82f6';
          result.badgeTextColor = textColor;
        }
      }
      
      // Tomar los colores del badge de descuento de la primera promoción que los defina
      if (promo.config?.discountBadgeColor && result.discountBadgeColor === '#10b981') {
        result.discountBadgeColor = promo.config.discountBadgeColor;
      }
      if (promo.config?.discountBadgeTextColor && result.discountBadgeTextColor === 'auto') {
        result.discountBadgeTextColor = promo.config.discountBadgeTextColor;
      }

      // Aplicar descuentos acumulativos (excepto fixed_price y buy_x_get_y)
      switch (promo.type) {
        case 'percentage_discount':
          const percentage = promo.config?.percentage || 0;
          currentPrice = currentPrice * (1 - percentage / 100);
          break;
          
        case 'fixed_price':
          // Precio fijo: usar el más bajo encontrado
          const newPrice = promo.config?.newPrice || 0;
          if (newPrice > 0 && newPrice < currentPrice) {
            currentPrice = newPrice;
          }
          break;
          
        case 'badge_only':
          // Solo badge, precio no cambia
          break;
          
        case 'buy_x_get_y':
          // Este tipo se maneja mejor en el carrito
          break;
      }
    });

    result.discountedPrice = Math.max(0, currentPrice);

    return result;
  }

  // Obtener badge de promoción para un producto
  function getPromotionBadge(product) {
    const promoResult = applyPromotionsToProduct(product);
    return promoResult.badge ? {
      text: promoResult.badge,
      color: promoResult.badgeColor
    } : null;
  }

  // Calcular precio con descuento
  function calculateDiscountedPrice(product, quantity = 1) {
    const promoResult = applyPromotionsToProduct(product);
    const activePromos = promoResult.promotions;
    
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
    const buyXgetYPromo = activePromos.find(p => p.type === 'buy_x_get_y');
    if (buyXgetYPromo) {
      const buyQty = buyXgetYPromo.config?.buyQuantity || 2;
      const payQty = buyXgetYPromo.config?.payQuantity || 1;
      
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
  function applyPromotionsToCart(cartItems) {
    const activePromos = getActivePromotions();
    let cartTotal = 0;
    let totalDiscount = 0;
    let appliedPromotions = [];
    let freeShipping = false;

    const processedItems = cartItems.map(item => {
      const product = { id: item.idProducto, precioUnitario: item.price };
      const pricing = calculateDiscountedPrice(product, item.quantity);
      
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
    const shippingPromos = activePromos.filter(p => p.type === 'free_shipping');
    for (const promo of shippingPromos) {
      const minAmount = promo.config?.minAmount || 0;
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
})();