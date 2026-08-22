// database/DatabaseProvider.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { database } from './index';

const DatabaseContext = createContext({
  database: null,
  isReady: false,
});

export function DatabaseProvider({ children, database: db }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Database is already initialized, just mark as ready
    setIsReady(true);
  }, [db]);

  return (
    <DatabaseContext.Provider value={{ database: db, isReady }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  return useContext(DatabaseContext);
}
