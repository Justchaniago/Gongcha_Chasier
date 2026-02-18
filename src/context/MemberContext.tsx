import React, { createContext, ReactNode, useContext, useState } from 'react';

export interface MemberCardAnchor {
  x: number;
  y: number;
  size: number;
}

interface MemberContextType {
  isCardVisible: boolean;
  anchor: MemberCardAnchor | null;
  showCard: (nextAnchor?: MemberCardAnchor) => void;
  hideCard: () => void;
}

const MemberContext = createContext<MemberContextType | undefined>(undefined);

export const MemberProvider = ({ children }: { children: ReactNode }) => {
  const [isCardVisible, setIsCardVisible] = useState(false);
  const [anchor, setAnchor] = useState<MemberCardAnchor | null>(null);

  const showCard = (nextAnchor?: MemberCardAnchor) => {
    if (nextAnchor) {
      setAnchor(nextAnchor);
    }
    setIsCardVisible(true);
  };
  const hideCard = () => setIsCardVisible(false);

  return (
    <MemberContext.Provider value={{ isCardVisible, anchor, showCard, hideCard }}>
      {children}
    </MemberContext.Provider>
  );
};

export const useMemberCard = () => {
  const context = useContext(MemberContext);

  if (!context) {
    throw new Error('useMemberCard must be used within a MemberProvider');
  }

  return context;
};