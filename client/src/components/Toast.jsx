import React, { createContext, useCallback, useContext, useState } from 'react';

const Ctx = createContext(null);
export function useToast() {
  return useContext(Ctx);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => <div className="toast" key={t.id}>{t.message}</div>)}
      </div>
    </Ctx.Provider>
  );
}
