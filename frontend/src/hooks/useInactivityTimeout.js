import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice';

/**
 * Hook to automatically log out the user after a period of inactivity.
 * @param {number} timeoutMs - Inactivity timeout in milliseconds (default: 30 minutes)
 */
const useInactivityTimeout = (timeoutMs = 30 * 60 * 1000) => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const timeoutRef = useRef(null);

  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (isAuthenticated) {
      timeoutRef.current = setTimeout(() => {
        console.log('Logging out due to inactivity...');
        dispatch(logout());
        // Force redirect to login page
        window.location.href = '/login';
      }, timeoutMs);
    }
  };

  useEffect(() => {
    const events = [
      'mousemove',
      'mousedown',
      'keypress',
      'DOMMouseScroll',
      'mousewheel',
      'touchmove',
      'MSPointerMove',
      'scroll',
      'click'
    ];

    const handleEvent = () => {
      resetTimer();
    };

    if (isAuthenticated) {
      // Set initial timer
      resetTimer();

      // Add event listeners
      events.forEach((event) => {
        window.addEventListener(event, handleEvent);
      });
    }

    return () => {
      // Cleanup
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleEvent);
      });
    };
  }, [isAuthenticated, dispatch, timeoutMs]);
};

export default useInactivityTimeout;
