import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  regionCode: string;
  state?: string;
  city?: string;
  createdAt: any;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as UserProfile;
}

export async function createUserProfile(
  uid: string,
  name: string,
  email: string,
  photoURL?: string
) {
  const ref = doc(db, "users", uid);
  const data = {
    uid,
    name,
    email,
    photoURL: photoURL || "",
    regionCode: "padrao",
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, data);
  return data as UserProfile;
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
  await setDoc(doc(db, "users", uid), data, { merge: true });
}
