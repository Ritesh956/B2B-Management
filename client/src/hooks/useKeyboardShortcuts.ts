import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, Role } from '../store/authStore';

type ShortcutHandlers = {
  onOpenNewPO?: () => void;
  onOpenSearch?: () => void;
  onOpenShortcutsHelp?: () => void;
  onEscape?: () => void;
};

export function useKeyboardShortcuts(handlers: ShortcutHandlers = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't fire shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        // But allow Escape to bubble
        if (e.key !== 'Escape') return;
      }

      // Don't fire if any modifier keys are held (Ctrl, Alt, Meta)
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      switch (e.key) {
        case 'v':
        case 'V':
          e.preventDefault();
          navigate('/vendors');
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          if (location.pathname === '/pos' && handlersRef.current.onOpenNewPO) {
            handlersRef.current.onOpenNewPO();
          } else {
            navigate('/pos');
          }
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          if (location.pathname === '/pos' && handlersRef.current.onOpenNewPO) {
            handlersRef.current.onOpenNewPO();
          } else {
            navigate('/pos');
          }
          break;
        case 'i':
        case 'I':
          e.preventDefault();
          navigate('/invoices');
          break;
        case 'c':
        case 'C':
          e.preventDefault();
          navigate('/contracts');
          break;
        case 'a':
        case 'A':
          if (user?.role === Role.ADMIN) {
            e.preventDefault();
            navigate('/audit-logs');
          }
          break;
        case '/':
          e.preventDefault();
          handlersRef.current.onOpenSearch?.();
          break;
        case '?':
          e.preventDefault();
          handlersRef.current.onOpenShortcutsHelp?.();
          break;
        case 'Escape':
          handlersRef.current.onEscape?.();
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate, location.pathname, user?.role]);
}
