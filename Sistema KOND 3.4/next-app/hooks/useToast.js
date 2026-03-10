import { useNotifications } from '../components/NotificationsProvider'

// Hook personalizado para facilitar el uso de notificaciones en Next.js
export const useToast = () => {
  const { addNotification } = useNotifications()

  const toast = {
    success: (title, body) => addNotification({
      title,
      body,
      type: 'success'
    }),
    
    error: (title, body) => addNotification({
      title, 
      body,
      type: 'error'
    }),
    
    warning: (title, body) => addNotification({
      title,
      body, 
      type: 'warning'
    }),
    
    info: (title, body) => addNotification({
      title,
      body,
      type: 'info'
    }),

    // Notificaciones específicas del negocio
    cartAdded: (productName) => addNotification({
      title: 'Producto agregado',
      body: `${productName} se agregó al carrito`,
      type: 'carrito',
      meta: { tipo: 'carrito', action: 'added' }
    }),

    orderCreated: (orderId) => addNotification({
      title: 'Pedido creado',
      body: `Se creó el pedido #${orderId} exitosamente`,
      type: 'pedido_nuevo',
      meta: { tipo: 'pedido_nuevo', orderId }
    }),

    orderDelivered: (orderId) => addNotification({
      title: 'Pedido entregado',
      body: `El pedido #${orderId} ha sido entregado`,
      type: 'pedido_entregado', 
      meta: { tipo: 'pedido_entregado', orderId }
    }),

    orderAssigned: (orderId, date) => addNotification({
      title: 'Pedido asignado',
      body: `El pedido #${orderId} fue asignado para ${date}`,
      type: 'pedido_asignado',
      meta: { tipo: 'pedido_asignado', orderId, date }
    }),

    financeUpdate: (title, description, amount) => addNotification({
      title,
      body: `${description}${amount ? ` - ${amount}` : ''}`,
      type: 'finanzas',
      meta: { tipo: 'finanzas', amount }
    }),

    productUpdate: (productName, action = 'updated') => addNotification({
      title: 'Producto actualizado',
      body: `${productName} ha sido ${action === 'created' ? 'creado' : action === 'deleted' ? 'eliminado' : 'actualizado'}`,
      type: 'producto',
      meta: { tipo: 'producto', action, productName }
    })
  }

  return toast
}

export default useToast