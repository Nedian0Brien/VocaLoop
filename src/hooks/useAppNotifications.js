import { useEffect, useRef, useState } from 'react';

export function useAppNotifications() {
  const [notification, setNotification] = useState(null);
  const notificationTimerRef = useRef(null);

  useEffect(() => () => {
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }
  }, []);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }
    notificationTimerRef.current = setTimeout(() => {
      setNotification(null);
      notificationTimerRef.current = null;
    }, 3000);
  };

  return { notification, showNotification };
}
