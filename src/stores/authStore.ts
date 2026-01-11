import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type User = {
  id: number;
  employeeId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  profilePhotoUrl: string | null;
  department: {
    id: number;
    name: string;
  } | null;
  designation: string | null;
};

type AuthStore = {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      clearAuth: () => set({ token: null, user: null }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
