import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { formatCurrency } from "../lib/utils";
import { getEstimatedPrice } from "../lib/priceService";
import { ArrowLeft, Plus, Check, Trash2, Edit3, Users, UserPlus, CheckCircle2, X } from "lucide-react";

interface Item {
  id: string;
  name: string;
  plannedQty: number;
  unit: string;
  estimatedPrice: number;
  actualPrice?: number;
  actualQty?: number;
  checked: boolean;
}

interface ListData {
  title: string;
  createdBy: string;
  status: string;
  participants: string[];
}

const UNITS = ["un", "kg", "l"];

export default function ListDetail() {
  const { listId } = useParams<{ listId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState<ListData | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [participantsEmails, setParticipantsEmails] = useState<Record<string, string>>({});

  // Add item form
  const [addMode, setAddMode] = useState(false);
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState(1);
  const [newUnit, setNewUnit] = useState("un");
  const [itemHistory, setItemHistory] = useState<string[]>([]);

  // Edit item
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState(0);
  const [editUnit, setEditUnit] = useState("un");

  // Checkout modal
  const [checkoutItem, setCheckoutItem] = useState<Item | null>(null);
  const [actualPrice, setActualPrice] = useState("");
  const [actualQty, setActualQty] = useState("");

  // Share
  const [showShare, setShowShare] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareError, setShareError] = useState("");

  // Finish
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (!listId || !user) return;

    const unsubList = onSnapshot(doc(db, "lists", listId), (snap) => {
      if (!snap.exists()) {
        navigate("/lists");
        return;
      }
      setList(snap.data() as ListData);
    });

    const itemsQuery = query(collection(db, "lists", listId, "items"), orderBy("createdAt", "asc"));
    const unsubItems = onSnapshot(itemsQuery, (snap) => {
      const it = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Item));
      setItems(it);
    });

    setLoading(false);

    return () => {
      unsubList();
      unsubItems();
    };
  }, [listId, user]);

  // Load participants emails
  useEffect(() => {
    if (!list?.participants) return;
    const loadEmails = async () => {
      const emails: Record<string, string> = {};
      for (const uid of list.participants) {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) emails[uid] = snap.data().email || uid;
      }
      setParticipantsEmails(emails);
    };
    loadEmails();
  }, [list?.participants]);

  // Load item history for autocomplete
  useEffect(() => {
    if (!user || !addMode) return;
    loadItemHistory();
  }, [addMode]);

  async function loadItemHistory() {
    const seen = new Set<string>(items.map((i) => i.name.toLowerCase()));
    const history: string[] = [];
    items.forEach((i) => {
      const low = i.name.toLowerCase();
      if (!history.some((h) => h.toLowerCase() === low)) history.push(i.name);
    });
    setItemHistory(history.slice(0, 10));
  }

  function getProgress() {
    if (items.length === 0) return { checked: 0, total: 0, pct: 0 };
    const checked = items.filter((i) => i.checked).length;
    return { checked, total: items.length, pct: Math.round((checked / items.length) * 100) };
  }

  async function handleAddItem() {
    if (!newName.trim() || !listId) return;
    const price = await getEstimatedPrice(newName.trim());
    await addDoc(collection(db, "lists", listId, "items"), {
      name: newName.trim(),
      plannedQty: newQty,
      unit: newUnit,
      estimatedPrice: price,
      checked: false,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "lists", listId), { lastUpdated: serverTimestamp() });
    setNewName("");
    setNewQty(1);
    setNewUnit("un");
    setAddMode(false);
  }

  async function handleEditItem(item: Item) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditQty(item.plannedQty);
    setEditUnit(item.unit);
  }

  async function handleSaveEdit() {
    if (!editingId || !listId) return;
    const price = await getEstimatedPrice(editName.trim());
    await updateDoc(doc(db, "lists", listId, "items", editingId), {
      name: editName.trim(),
      plannedQty: editQty,
      unit: editUnit,
      estimatedPrice: price,
    });
    await updateDoc(doc(db, "lists", listId), { lastUpdated: serverTimestamp() });
    setEditingId(null);
  }

  async function handleDeleteItem(itemId: string) {
    if (!listId) return;
    await deleteDoc(doc(db, "lists", listId, "items", itemId));
    await updateDoc(doc(db, "lists", listId), { lastUpdated: serverTimestamp() });
  }

  function openCheckout(item: Item) {
    setCheckoutItem(item);
    setActualPrice(item.actualPrice?.toString() || "");
    setActualQty(item.actualQty?.toString() || item.plannedQty.toString());
  }

  async function handleCheckout() {
    if (!checkoutItem || !listId) return;
    await updateDoc(doc(db, "lists", listId, "items", checkoutItem.id), {
      checked: true,
      actualPrice: parseFloat(actualPrice) || 0,
      actualQty: parseFloat(actualQty) || checkoutItem.plannedQty,
    });
    await updateDoc(doc(db, "lists", listId), { lastUpdated: serverTimestamp() });
    setCheckoutItem(null);
  }

  async function handleUncheck(item: Item) {
    if (!listId) return;
    await updateDoc(doc(db, "lists", listId, "items", item.id), {
      checked: false,
      actualPrice: null,
      actualQty: null,
    });
    await updateDoc(doc(db, "lists", listId), { lastUpdated: serverTimestamp() });
  }

  async function handleShare() {
    if (!shareEmail.trim() || !listId) return;
    setShareError("");
    const usersRef = collection(db, "users");
    const allUsers = await getDocs(usersRef);
    let targetUid = "";
    allUsers.forEach((d) => {
      if (d.data().email === shareEmail.trim()) {
        targetUid = d.id;
      }
    });

    if (!targetUid) {
      setShareError("Usuário não encontrado. Ele precisa ter uma conta no CompraCerta.");
      return;
    }

    if (list?.participants.includes(targetUid)) {
      setShareError("Este usuário já participa da lista.");
      return;
    }

    await updateDoc(doc(db, "lists", listId), {
      participants: [...(list?.participants || []), targetUid],
    });
    setShareEmail("");
    setShowShare(false);
  }

  async function handleFinish() {
    if (!listId || !window.confirm("Finalizar lista? Ela será movida para o histórico.")) return;
    setFinishing(true);
    await updateDoc(doc(db, "lists", listId), {
      status: "completed",
      lastUpdated: serverTimestamp(),
    });
    setFinishing(false);
    navigate("/history");
  }

  if (loading || !list) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  const progress = getProgress();
  const estimatedTotal = items.reduce((sum, i) => sum + (i.estimatedPrice || 0) * i.plannedQty, 0);
  const actualTotal = items.reduce((sum, i) => sum + (i.actualPrice || 0) * (i.actualQty || i.plannedQty), 0);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/lists")}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {list.title}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400">
              {list.participants.map((uid) => participantsEmails[uid] || uid).join(", ")}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowShare(true)}
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500"
            title="Compartilhar"
          >
            <UserPlus className="w-5 h-5" />
          </button>
          {list.status === "active" && list.createdBy === user?.uid && (
            <button
              onClick={handleFinish}
              disabled={finishing}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              Finalizar
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Progresso: {progress.checked}/{progress.total} itens
          </span>
          <span className="text-sm font-bold text-primary-600">{progress.pct}%</span>
        </div>
        <div className="w-full h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full transition-all duration-500"
            style={{ width: `${progress.pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-3 text-sm">
          <span className="text-gray-400">
            Estimado: <strong className="text-blue-600">{formatCurrency(estimatedTotal)}</strong>
          </span>
          <span className="text-gray-400">
            Real: <strong className="text-green-600">{formatCurrency(actualTotal)}</strong>
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`card flex items-center gap-3 ${
              item.checked ? "opacity-60 bg-gray-50 dark:bg-gray-900/50" : ""
            }`}
          >
            {editingId === item.id ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input-field flex-1 text-sm py-1.5"
                />
                <input
                  type="number"
                  value={editQty}
                  onChange={(e) => setEditQty(parseFloat(e.target.value) || 1)}
                  min={0.1}
                  step={0.1}
                  className="input-field w-20 text-sm py-1.5"
                />
                <select
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                  className="input-field w-16 text-sm py-1.5"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
                <button onClick={handleSaveEdit} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-950 rounded-lg">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {item.checked ? (
                      <button
                        onClick={() => handleUncheck(item)}
                        className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0"
                      >
                        <Check className="w-3 h-3 text-white" />
                      </button>
                    ) : (
                      <button
                        onClick={() => openCheckout(item)}
                        className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0 hover:border-primary-500 transition-colors"
                      />
                    )}
                    <span className={`text-sm ${item.checked ? "line-through" : "font-medium"}`}>
                      {item.name}
                    </span>
                  </div>
                  <div className="flex gap-3 mt-0.5 ml-7 text-xs text-gray-400">
                    <span>{item.plannedQty} {item.unit}</span>
                    <span>Est. {formatCurrency((item.estimatedPrice || 0) * item.plannedQty)}</span>
                    {item.checked && item.actualPrice && (
                      <span className="text-green-600">
                        Real {formatCurrency(item.actualPrice * (item.actualQty || item.plannedQty))}
                      </span>
                    )}
                  </div>
                </div>
                {!item.checked && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditItem(item)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        {/* Add item button */}
        {addMode ? (
          <div className="card">
            <div className="space-y-3">
              <div>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="input-field text-sm"
                  placeholder="Nome do produto"
                  autoFocus
                  list="item-history"
                />
                <datalist id="item-history">
                  {itemHistory.map((h) => (
                    <option key={h} value={h} />
                  ))}
                </datalist>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newQty}
                  onChange={(e) => setNewQty(parseFloat(e.target.value) || 1)}
                  min={0.1}
                  step={0.1}
                  className="input-field w-24 text-sm"
                  placeholder="Qtd"
                />
                <select
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="input-field w-20 text-sm"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
                <button onClick={handleAddItem} className="btn-primary text-sm flex-1">
                  Adicionar
                </button>
                <button
                  onClick={() => setAddMode(false)}
                  className="btn-secondary text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        ) : (
          list.status === "active" && (
            <button
              onClick={() => setAddMode(true)}
              className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-400 hover:border-primary-500 hover:text-primary-500 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar item
            </button>
          )
        )}
      </div>

      {/* Checkout modal */}
      {checkoutItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-sm">
            <h3 className="font-semibold mb-1">Marcar como comprado</h3>
            <p className="text-sm text-gray-500 mb-4">{checkoutItem.name}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Preço real (R$)</label>
                <input
                  type="number"
                  value={actualPrice}
                  onChange={(e) => setActualPrice(e.target.value)}
                  className="input-field"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Quantidade efetiva</label>
                <input
                  type="number"
                  value={actualQty}
                  onChange={(e) => setActualQty(e.target.value)}
                  className="input-field"
                  step="0.1"
                  min="0.1"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleCheckout} className="btn-primary flex-1">
                  Confirmar
                </button>
                <button
                  onClick={() => setCheckoutItem(null)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share modal */}
      {showShare && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-sm">
            <h3 className="font-semibold mb-4">Compartilhar lista</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  E-mail do participante
                </label>
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  className="input-field"
                  placeholder="amigo@email.com"
                />
                {shareError && (
                  <p className="text-red-500 text-sm mt-1">{shareError}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleShare}
                  disabled={!shareEmail.trim()}
                  className="btn-primary flex-1"
                >
                  Convidar
                </button>
                <button
                  onClick={() => {
                    setShowShare(false);
                    setShareError("");
                    setShareEmail("");
                  }}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
