import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../config/firebase'; // Pastikan path import ini benar

// Tipe data Staff
type StaffProfile = {
  uid: string;
  email: string;
  name: string;
  role: 'cashier' | 'store_manager';
  storeLocation: string;
};

type StaffAuthContextType = {
  staff: StaffProfile | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
};

const StaffAuthContext = createContext<StaffAuthContextType>({} as StaffAuthContextType);

export const useStaffAuth = () => useContext(StaffAuthContext);

export const StaffAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Cek User saat aplikasi dibuka
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (currentUser) => {
      if (currentUser) {
        await fetchStaffProfile(currentUser.uid);
      } else {
        setStaff(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // 2. Fungsi ambil data profil dari collection 'staff'
  const fetchStaffProfile = async (uid: string) => {
    try {
      console.log("🔍 Mencari Data Staff untuk UID:", uid); // <--- LOG 1
      const docRef = doc(firestoreDb, 'staff', uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        console.log("✅ Data Ditemukan:", docSnap.data()); // <--- LOG 2
        const data = docSnap.data();
        setStaff({
          uid: uid,
          email: data.email,
          name: data.name,
          role: data.role,
          storeLocation: data.storeLocation
        });
      } else {
        console.error("❌ Dokumen tidak ada di path: staff/" + uid); // <--- LOG 3
        alert("Login Berhasil, tapi Data Profil Staff Kosong. Cek Firestore!");
        await signOut(firebaseAuth);
        setStaff(null);
      }
    } catch (error: any) { // Type any agar bisa baca message
      console.error("🔥 Error Fetch:", error.message); // <--- LOG 4
      alert("Error Database: " + error.message); 
    } finally {
      setLoading(false);
    }
  };

  // 3. Fungsi Login
  const login = async (email: string, pass: string) => {
    setLoading(true);
    await signInWithEmailAndPassword(firebaseAuth, email, pass);
    // onAuthStateChanged akan otomatis jalan setelah ini untuk fetch profile
  };

  // 4. Fungsi Logout
  const logout = async () => {
    await signOut(firebaseAuth);
    setStaff(null);
  };

  return (
    <StaffAuthContext.Provider value={{ staff, loading, login, logout }}>
      {children}
    </StaffAuthContext.Provider>
  );
};
