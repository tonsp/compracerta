import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  updateProfile,
  User,
} from "firebase/auth";
import { auth } from "./firebase";
import { getUserProfile, createUserProfile } from "./firestore";

export type { User } from "firebase/auth";

const googleProvider = new GoogleAuthProvider();

export async function loginWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmail(
  name: string,
  email: string,
  password: string
) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await createUserProfile(cred.user.uid, name, email);
  return cred;
}

export async function loginWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  const existing = await getUserProfile(cred.user.uid);
  if (!existing) {
    await createUserProfile(
      cred.user.uid,
      cred.user.displayName || "Usuário",
      cred.user.email || "",
      cred.user.photoURL || ""
    );
  }
  return cred;
}

export async function logout() {
  return signOut(auth);
}

export function onAuthChange(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}
