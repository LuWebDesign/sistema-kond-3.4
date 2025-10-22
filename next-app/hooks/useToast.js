import { useNotifications } from '../components/NotificationsProvider'

// Hook personalizado para facilitar el uso de notificaciones en Next.js
export const useToast = () => {
  const { addNotification } = useNotifications()

  const toast = {
    success: (title, body) => addNotification({
      title,
      body,
      type: 'success',
      meta: { target: 'admin' }
    }),
    
    error: (title, body) => addNotification({
      title, 
      body,
      type: 'error',
      meta: { target: 'admin' }
    }),
    
    warning: (title, body) => addNotification({
      title,
      body, 
      type: 'warning',
      meta: { target: 'admin' }
    }),
    
    info: (title, body) => addNotification({
      title,
      body,
      type: 'info',
      meta: { target: 'admin' }
    }),

    // Notificaciones específicas del negocio
    cartAdded: (productName) => addNotification({
      title: 'Producto agregado',
      body: `${productName} se agregó al carrito`,
      type: 'carrito',
      meta: { tipo: 'carrito', action: 'added', target: 'user' }
    }),

    orderCreated: (orderId) => addNotification({
      title: 'Pedido creado',
      body: `Se creó el pedido #${orderId} exitosamente`,
      type: 'pedido_nuevo',
      meta: { tipo: 'pedido_nuevo', orderId, target: 'admin' }
    }),

    orderDelivered: (orderId) => addNotification({
      title: 'Pedido entregado',
      body: `El pedido #${orderId} ha sido entregado`,
      type: 'pedido_entregado', 
      meta: { tipo: 'pedido_entregado', orderId, target: 'admin' }
    }),

    orderAssigned: (orderId, date) => addNotification({
      title: 'Pedido asignado',
      body: `El pedido #${orderId} fue asignado para ${date}`,
      type: 'pedido_asignado',
      meta: { tipo: 'pedido_asignado', orderId, date, target: 'admin' }
    }),

    financeUpdate: (title, description, amount) => addNotification({
      title,
      body: `${description}${amount ? ` - ${amount}` : ''}`,
      type: 'finanzas',
      meta: { tipo: 'finanzas', amount, target: 'admin' }
    }),

    productUpdate: (productName, action = 'updated') => addNotification({
      title: 'Producto actualizado',
      body: `${productName} ha sido ${action === 'created' ? 'creado' : action === 'deleted' ? 'eliminado' : 'actualizado'}`,
      type: 'producto',
      meta: { tipo: 'producto', action, productName, target: 'admin' }
    }),

    // Alias por rol para paridad con el sistema viejo
    admin: {
      success: (title, body) => addNotification({ title, body, type: 'success', meta: { target: 'admin' } }),
      error: (title, body) => addNotification({ title, body, type: 'error', meta: { target: 'admin' } }),
      warning: (title, body) => addNotification({ title, body, type: 'warning', meta: { target: 'admin' } }),
      info: (title, body) => addNotification({ title, body, type: 'info', meta: { target: 'admin' } }),
      orderCreated: (orderId) => addNotification({ title: 'Pedido creado', body: `Se creó el pedido #${orderId}`, type: 'pedido_nuevo', meta: { tipo: 'pedido_nuevo', orderId, target: 'admin' } }),
      orderAssigned: (orderId, date) => addNotification({ title: 'Pedido asignado', body: `Pedido #${orderId} → ${date}`, type: 'pedido_asignado', meta: { tipo: 'pedido_asignado', orderId, date, target: 'admin' } }),
      orderDelivered: (orderId) => addNotification({ title: 'Pedido entregado', body: `Pedido #${orderId} entregado`, type: 'pedido_entregado', meta: { tipo: 'pedido_entregado', orderId, target: 'admin' } }),
    },
    user: {
      success: (title, body) => addNotification({ title, body, type: 'success', meta: { target: 'user' } }),
      error: (title, body) => addNotification({ title, body, type: 'error', meta: { target: 'user' } }),
      warning: (title, body) => addNotification({ title, body, type: 'warning', meta: { target: 'user' } }),
      info: (title, body) => addNotification({ title, body, type: 'info', meta: { target: 'user' } }),
      orderStatus: (orderId, statusLabel) => addNotification({ title: 'Actualización de pedido', body: `Tu pedido #${orderId} está ${statusLabel}`, type: 'pedido_estado', meta: { tipo: 'pedido_estado', orderId, target: 'user' } }),
      orderAssigned: (orderId, date) => addNotification({ title: 'Fecha de entrega', body: `Tu pedido #${orderId} fue asignado al ${date}`, type: 'pedido_asignado', meta: { tipo: 'pedido_asignado', orderId, date, target: 'user' } })
    }
  }

  return toast
}

export default useToast