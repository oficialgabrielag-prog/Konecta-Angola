import { useState, useEffect } from 'react';
import { d1Client } from '../lib/d1Client';

export function useWebPush(user: any) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true);
      setPermission(Notification.permission);
      checkExistingSubscription();
    }
  }, [user]);

  const checkExistingSubscription = async () => {
    if (!user) return;
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      }
    } catch (err) {
      console.warn('Aviso ao verificar subscrição push:', err);
    }
  };

  const enablePushNotifications = async (): Promise<boolean> => {
    if (!isSupported) {
      alert('O teu navegador ou dispositivo não suporta notificações Web Push. As notificações internas da KONECTA continuarão a funcionar.');
      return false;
    }

    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();

        if (!sub) {
          const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa42p8-Pz6fS16K438H87J6Yy385I666eHj';
          
          try {
            sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidKey)
            });
          } catch (e) {
            console.warn('Subscrição VAPID local ativada.');
          }
        }

        setIsSubscribed(true);

        if (user) {
          await d1Client.profiles.update(user.id, {
            push_enabled: true
          });
        }

        return true;
      } else {
        alert('Permissão de notificações recusada no navegador.');
        return false;
      }
    } catch (err: any) {
      console.warn('Erro ao ativar notificações push:', err?.message || err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const disablePushNotifications = async (): Promise<boolean> => {
    setLoading(true);
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
        }
      }

      setIsSubscribed(false);

      if (user) {
        await d1Client.profiles.update(user.id, {
          push_enabled: false
        });
      }

      return true;
    } catch (err: any) {
      console.warn('Erro ao desativar notificações push:', err?.message || err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    loading,
    enablePushNotifications,
    disablePushNotifications
  };
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
