import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useWebPush(user: any) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

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
    if (!vapidKey) {
      alert('Notificações push indisponíveis neste momento.');
      return false;
    }

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
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey)
          });
        }

        if (sub && user) {
          const deviceToken = JSON.stringify(sub);
          const { error } = await supabase.from('push_devices').upsert({
            user_id: user.id,
            device_token: deviceToken,
            platform: 'web',
            enabled: true,
            last_seen_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          }, { onConflict: 'user_id,device_token' });

          if (error) {
            console.error('Erro ao registar dispositivo push:', error);
            alert(`Falha ao registar o dispositivo: ${error.message}`);
            return false;
          }

          setIsSubscribed(true);
          return true;
        }

        return false;
      } else {
        alert('Permissão de notificações recusada no navegador.');
        return false;
      }
    } catch (err: any) {
      console.error('Erro ao ativar notificações push:', err);
      alert(err?.message || 'Erro ao ativar subscrição Web Push.');
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
          if (user) {
            const deviceToken = JSON.stringify(sub);
            await supabase.from('push_devices').update({
              enabled: false,
              last_seen_at: new Date().toISOString()
            }).match({ user_id: user.id, device_token: deviceToken });
          }

          await sub.unsubscribe();
        }
      }

      setIsSubscribed(false);
      return true;
    } catch (err: any) {
      console.error('Erro ao desativar notificações push:', err);
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
    disablePushNotifications,
    isPushAvailable: Boolean(vapidKey)
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
