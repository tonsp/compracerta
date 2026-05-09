import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import { formatDate, formatCurrency } from "../lib/utils";
import { Plus, Trash2, Users, ArrowRight, Sparkles } from "lucide-react";
import { getEstimatedPrice } from "../lib/priceService";

interface Lista {
  id: string;
  title: string;
  createdBy: string;
  createdAt: any;
  status: string;
  participants: string[];
  itemCount?: number;
  estimatedTotal?: number;
}

export default function Lists() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lists, setLists] = useState<Lista[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "lists"),
      where("participants", "array-contains", user.uid),
      orderBy("lastUpdated", "desc")
    );

    const unsub = onSnapshot(q, async (snap) => {
      const raw = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Lista));

      const enriched = await Promise.all(
        raw.map(async (list) => {
          const itemsSnap = await getDocs(
            collection(db, "lists", list.id, "items")
          );
          let total = 0;
          itemsSnap.forEach((d) => {
            const item = d.data();
            total += (item.estimatedPrice || 0) * (item.plannedQty || 0);
          });
          return {
            ...list,
            itemCount: itemsSnap.size,
            estimatedTotal: Math.round(total * 100) / 100,
          };
        })
      );

      setLists(enriched);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (showCreate) loadSuggestions();
  }, [showCreate]);

  async function loadSuggestions() {
    const q = query(
      collection(db, "lists"),
      where("participants", "array-contains", user!.uid),
      where("status", "==", "completed")
    );
    const snap = await getDocs(q);
    const itemFreq: Record<string, { count: number; lastDate: Date }> = {};

    for (const listDoc of snap.docs) {
      const itemsSnap = await getDocs(
        collection(db, "lists", listDoc.id, "items")
      );
      itemsSnap.forEach((itemDoc) => {
        const item = itemDoc.data();
        const name = item.name?.toLowerCase().trim();
        if (!name) return;
        if (!itemFreq[name]) {
          itemFreq[name] = { count: 0, lastDate: new Date(0) };
        }
        itemFreq[name].count++;
        const d = listDoc.data().createdAt?.toDate?.() || new Date(0);
        if (d > itemFreq[name].lastDate) itemFreq[name].lastDate = d;
      });
    }

    const totalLists = snap.size;
    const now = new Date();
    const suggested = Object.entries(itemFreq)
      .filter(([, v]) => {
        const freq = v.count / totalLists;
        const daysSince = (now.getTime() - v.lastDate.getTime()) / (1000 * 86400);
        return freq > 0.6 && daysSince < 30;
      })
      .map(([name]) => name.charAt(0).toUpperCase() + name.slice(1));

    setSuggestions(suggested.slice(0, 8));
  }

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setBusy(true);
    const docRef = await addDoc(collection(db, "lists"), {
      title: newTitle.trim(),
      createdBy: user!.uid,
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
      status: "active",
      participants: [user!.uid],
    });
    setNewTitle("");
    setShareEmail("");
    setShowCreate(false);
    setBusy(false);
    navigate(`/lists/${docRef.id}`);
  }

  async function handleDelete(listId: string) {
    if (!window.confirm("Excluir esta lista?")) return;
    setDeletingId(listId);
    const itemsSnap = await getDocs(
      collection(db, "lists", listId, "items")
    );
    const batch = itemsSnap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(batch);
    await deleteDoc(doc(db, "lists", listId));
    setDeletingId(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Minhas Listas
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {lists.length} lista{lists.length !== 1 ? "s" : ""} ativa
            {lists.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nova Lista
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Nova Lista</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Nome da lista
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="input-field"
                  placeholder="Ex: Compras da semana"
                />
              </div>

              {suggestions.length > 0 && (
                <div>
                  <label className="flex items-center gap-1 text-sm font-medium mb-1.5 text-amber-600">
                    <Sparkles className="w-4 h-4" />
                    Sugestões baseadas no histórico
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() =>
                          setNewTitle(
                            newTitle ? `${newTitle} + ${s}` : `Comprar ${s}`
                          )
                        }
                        className="px-3 py-1 text-xs bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleCreate}
                  disabled={busy || !newTitle.trim()}
                  className="btn-primary flex-1"
                >
                  {busy ? "Criando..." : "Criar"}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List grid */}
      {lists.length === 0 ? (
        <div className="card text-center py-12">
          <ShoppingBasketIcon className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400">
            Nenhuma lista ainda
          </h3>
          <p className="text-gray-400 dark:text-gray-500 mt-1">
            Crie sua primeira lista de compras.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map((list) => (
            <div
              key={list.id}
              className="card hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => navigate(`/lists/${list.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                    {list.title}
                  </h3>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {formatDate(list.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      list.status === "completed"
                        ? "bg-green-500"
                        : "bg-amber-500"
                    }`}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(list.id);
                    }}
                    disabled={deletingId === list.id}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    {deletingId === list.id ? (
                      <div className="animate-spin w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <ShoppingBasketIconSmall className="w-4 h-4" />
                  {list.itemCount || 0} itens
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {list.participants?.length || 1}
                </span>
              </div>

              {list.estimatedTotal ? (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <span className="text-sm text-gray-400">Estimativa</span>
                  <span className="font-semibold text-primary-600">
                    {formatCurrency(list.estimatedTotal)}
                  </span>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ShoppingBasketIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

function ShoppingBasketIconSmall({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}
