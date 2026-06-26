import React, { createContext, useContext, useState } from 'react';

interface EditModeContextType {
  editMode: boolean;
  setEditMode: React.Dispatch<React.SetStateAction<boolean>>;
}

const EditModeContext = createContext<EditModeContextType | undefined>(undefined);

export const EditModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [editMode, setEditMode] = useState(false);
  return (
    <EditModeContext.Provider value={{ editMode, setEditMode }}>
      {children}
    </EditModeContext.Provider>
  );
};

export const useEditMode = () => {
  const ctx = useContext(EditModeContext);
  if (ctx === undefined) {
    throw new Error('useEditMode must be used within an EditModeProvider');
  }
  return ctx;
};
