import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../config/firebase';
// Import tipe data yang baru dibuat
import { StaffProfile } from '../types/types'; 

interface StaffAuthContextType {
  staff: StaffProfile | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const StaffAuthContext = createContext<StaffAuthContextType | undefined>(undefined);

export const useStaffAuth = () => {
  const context = useContext(StaffAuthContext);
  if (!context) throw new Error('useStaffAuth must be used within StaffAuthProvider');
  return context;
};

export const StaffAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (currentUser) => {
      if (currentUser) {
        // Ambil data detail staff dari Firestore
        try {
          const docRef = doc(firestoreDb, 'staff', currentUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            setStaff({
              id: currentUser.uid, // Mapping uid ke id
              name: data.name,
              email: data.email,
              role: data.role,
              storeLocation: data.storeLocation
            });
          } else {
            // Fallback jika login berhasil tapi data staff tidak ada di DB
            setStaff({
              id: currentUser.uid,
              name: currentUser.email?.split('@')[0] || 'Staff',
              email: currentUser.email || '',
              role: 'cashier',
              storeLocation: 'Unknown Location'
            });
          }
        } catch (e) {
          console.error("Error fetching staff profile", e);
        }
      } else {
        setStaff(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(firebaseAuth, email, pass);
  };

  const logout = async () => {
    await signOut(firebaseAuth);
  };

  return (
    <StaffAuthContext.Provider value={{ staff, loading, login, logout }}>
      {children}
    </StaffAuthContext.Provider>
  );
};