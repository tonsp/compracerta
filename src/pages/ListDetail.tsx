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
import {
  getEstimatedPrice,
  getAllCategories,
  getAllProductsByCategory,
  saveUserPrice,
} from "../lib/priceService";
import {
  ArrowLeft, Plus, Check, Trash2, Edit3, Users, UserPlus, CheckCircle2, X,
  ChevronDown, ChevronRight, Search, Pencil, DollarSign
} from "lucide-react";

interface Item {
  id: string;
  name: string;
  plannedQty: number;
  unit: string;
  estimatedPrice: number;
  actualPrice?: number;
  actualQty?: number;
  checked: boolean;
  section: string;
}

interface ListData {
  title: string;
  createdBy: string;
  status: string;
  participants: string[];
}

const UNITS = ["un", "kg", "l", "g", "ml", "cx", "pacote", "dúzia"];

export default function ListDetail() {
  const { listId } = useParams<{ listId: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState<ListData | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [participantNames, setParticipantNames] = useState<Record<string, string>>({});

  // Add item — categorized picker
  const [addMode, setAddMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newQty, setNewQty] = useState(1);
  const [newUnit, setNewUnit] = useState("un");
  const [newSection, setNewSection] = useState("");
  const [newCustomPrice, setNewCustomPrice] = useState("");
  const [categories] = useState(() => getAllCategories());
  const [productsByCategory] = useState(() => getAllProductsByCategory());
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Edit item
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState(0);
  const [editUnit, setEditUnit] = useState("un");
  const [editSection, setEditSection] = useState("");
  const [editEstimatedPrice, setEditEstimatedPrice] = useState(0);

  // Checkout modal
  const [checkoutItem, setCheckoutItem] = useState<Item | null>(null);
  const [checkoutMode, setCheckoutMode] = useState<"unitario" | "total">("unitario");
  const [checkoutUnitPrice, setCheckoutUnitPrice] = useState("");
  const [checkoutTotalValue, setCheckoutTotalValue] = useState("");
  const [checkoutActualQty, setCheckoutActualQty] = useState("");

  // Share
  const [showShare, setShowShare] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareError, setShareError] = useState("");

  // Finish
  const [finishing, setFinishing] = useState(false);

  // Collapsed sections
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!listId || !user) return;

    const unsubList = onSnapshot(doc(db, "lists", listId), (snap) => {
      if (!snap.exists()) { navigate("/lists"); return; }
      setList(snap.data() as ListData);
    });

    const itemsQuery = query(
      collection(db, "lists", listId, "items"),
      orderBy("createdAt", "asc")
    );
    const unsubItems = onSnapshot(itemsQuery, (snap) => {
      const it = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Item));
      setItems(it);
    });

    setLoading(false);

    return () => { unsubList(); unsubItems(); };
  }, [listId, user]);

  // Load participant names
  useEffect(() => {
    if (!list?.participants) return;
    const loadNames = async () => {
      const names: Record<string, string> = {};
      for (const uid of list.participants) {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
          names[uid] = snap.data().name || snap.data().email || uid;
        }
      }
      setParticipantNames(names);
    };
    loadNames();
  }, [list?.participants]);

  // Filter products by search
  const filteredProducts = (() => {
    if (!searchQuery.trim()) return productsByCategory;
    const q = searchQuery.toLowerCase();
    const result: Record<string, string[]> = {};
    for (const [cat, prods] of Object.entries(productsByCategory)) {
      const filtered = prods.filter((p) => p.toLowerCase().includes(q));
      if (filtered.length > 0) result[cat] = filtered;
    }
    return result;
  })();

  // Group items by section
  const sections = (() => {
    const map: Record<string, Item[]> = {};
    for (const item of items) {
      const s = item.section || "Geral";
      if (!map[s]) map[s] = [];
      map[s].push(item);
    }
    return map;
  })();

  function getProgress() {
    if (items.length === 0) return { checked: 0, total: 0, pct: 0 };
    const checked = items.filter((i) => i.checked).length;
    return { checked, total: items.length, pct: Math.round((checked / items.length) * 100) };
  }

  async function handleSelectProduct(productName: string) {
    if (!listId) return;
    const region = profile?.regionCode || profile?.state || "padrao";
    let price = await getEstimatedPrice(productName, region, user?.uid);
    if (newCustomPrice) price = parseFloat(newCustomPrice) || price;
    await addDoc(collection(db, "lists", listId, "items"), {
      name: productName,
      plannedQty: newQty,
      unit: newUnit,
      estimatedPrice: price,
      checked: false,
      section: newSection || "",
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "lists", listId), { lastUpdated: serverTimestamp() });
    if (newCustomPrice && user) {
      await saveUserPrice(user.uid, region, productName, price);
    }
    resetAddForm();
  }

  async function handleAddCustom() {
    if (!newCustomPrice.trim() && !searchQuery.trim()) return;
    const name = searchQuery.trim() || "Novo item";
    await handleSelectProduct(name);
  }

  function resetAddForm() {
    setSearchQuery("");
    setNewQty(1);
    setNewUnit("un");
    setNewSection("");
    setNewCustomPrice("");
    setAddMode(false);
    setExpandedCat(null);
    setShowCustomInput(false);
  }

  async function handleEditItem(item: Item) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditQty(item.plannedQty);
    setEditUnit(item.unit);
    setEditSection(item.section || "");
    setEditEstimatedPrice(item.estimatedPrice || 0);
  }

  async function handleSaveEdit() {
    if (!editingId || !listId) return;
    await updateDoc(doc(db, "lists", listId, "items", editingId), {
      name: editName.trim(),
      plannedQty: editQty,
      unit: editUnit,
      estimatedPrice: editEstimatedPrice,
      section: editSection || "",
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
    setCheckoutMode("unitario");
    setCheckoutUnitPrice(item.actualPrice?.toString() || "");
    setCheckoutTotalValue(
      item.actualPrice && item.actualQty
        ? (item.actualPrice * item.actualQty).toFixed(2)
        : ""
    );
    setCheckoutActualQty(item.actualQty?.toString() || "");
  }

  function getCheckoutResult() {
    const qty = parseFloat(checkoutActualQty) || checkoutItem?.plannedQty || 0;
    if (checkoutMode === "unitario") {
      const unitPrice = parseFloat(checkoutUnitPrice) || 0;
      return { unitPrice, actualQty: qty, total: unitPrice * qty };
    } else {
      const total = parseFloat(checkoutTotalValue) || 0;
      const unitPrice = qty > 0 ? total / qty : 0;
      return { unitPrice, actualQty: qty, total };
    }
  }

  async function handleCheckout() {
    if (!checkoutItem || !listId) return;
    const { unitPrice, actualQty } = getCheckoutResult();
    await updateDoc(doc(db, "lists", listId, "items", checkoutItem.id), {
      checked: true,
      actualPrice: Math.round(unitPrice * 100) / 100,
      actualQty: actualQty,
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
      if (d.data().email === shareEmail.trim()) targetUid = d.id;
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

  function toggleSection(section: string) {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
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
  const actualTotal = items.reduce(
    (sum, i) => sum + (i.actualPrice || 0) * (i.actualQty || i.plannedQty), 0
  );

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{list.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400">
              {list.participants.map((uid) => participantNames[uid] || uid).join(", ")}
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

      {/* Items grouped by section */}
      {Object.entries(sections).map(([section, sectionItems]) => (
        <div key={section} className="space-y-2">
          <button
            onClick={() => toggleSection(section)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            {collapsedSections[section] ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            {section}
            <span className="text-xs text-gray-400 font-normal">
              ({sectionItems.length})
            </span>
          </button>

          {!collapsedSections[section] && sectionItems.map((item) => (
            <div
              key={item.id}
              className={`card flex items-center gap-3 ${
                item.checked ? "opacity-60 bg-gray-50 dark:bg-gray-900/50" : ""
              }`}
            >
              {editingId === item.id ? (
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="input-field flex-1 text-sm py-1.5"
                      placeholder="Nome"
                    />
                    <input
                      type="text"
                      value={editSection}
                      onChange={(e) => setEditSection(e.target.value)}
                      className="input-field w-32 text-sm py-1.5"
                      placeholder="Seção"
                    />
                  </div>
                  <div className="flex gap-2 items-center">
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
                      className="input-field w-20 text-sm py-1.5"
                    >
                      {UNITS.map((u) => (<option key={u} value={u}>{u}</option>))}
                    </select>
                    <span className="text-xs text-gray-400">Preço est. R$</span>
                    <input
                      type="number"
                      value={editEstimatedPrice}
                      onChange={(e) => setEditEstimatedPrice(parseFloat(e.target.value) || 0)}
                      min={0}
                      step={0.01}
                      className="input-field w-24 text-sm py-1.5"
                    />
                    <button onClick={handleSaveEdit} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-950 rounded-lg">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
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
                      {item.section && <span className="text-gray-300">{item.section}</span>}
                      {item.checked && item.actualPrice && (
                        <span className="text-green-600 font-medium">
                          Real {formatCurrency(item.actualPrice)}/{item.unit} ={" "}
                          {formatCurrency(item.actualPrice * (item.actualQty || item.plannedQty))}
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
                        <Pencil className="w-3.5 h-3.5" />
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
        </div>
      ))}

      {/* Add item */}
      {addMode ? (
        <div className="card">
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10"
                placeholder="Buscar ou digitar produto..."
                autoFocus
              />
            </div>

            {/* Category tabs */}
            {!searchQuery.trim() && (
              <div className="flex flex-wrap gap-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setExpandedCat(expandedCat === cat ? null : cat)}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      expandedCat === cat
                        ? "bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Product grid — filtered by category or search */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {Object.entries(filteredProducts).map(([cat, prods]) => {
                if (!searchQuery.trim() && expandedCat !== cat) return null;
                return (
                  <div key={cat}>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                      {cat}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {prods.map((p) => (
                        <button
                          key={p}
                          onClick={() => handleSelectProduct(p)}
                          className="px-2.5 py-1 text-xs bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {Object.keys(filteredProducts).length === 0 && searchQuery.trim() && (
                <p className="text-sm text-gray-400 text-center py-4">
                  Nenhum produto encontrado. Use o campo abaixo para adicionar um item personalizado.
                </p>
              )}
            </div>

            {/* Quantity, unit, section */}
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={newQty}
                onChange={(e) => setNewQty(parseFloat(e.target.value) || 1)}
                min={0.1}
                step={0.1}
                className="input-field w-20 text-sm"
                placeholder="Qtd"
              />
              <select
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                className="input-field w-22 text-sm"
              >
                {UNITS.map((u) => (<option key={u} value={u}>{u}</option>))}
              </select>
              <input
                type="text"
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                className="input-field flex-1 text-sm"
                placeholder="Seção (ex: Hortifruti)"
              />
            </div>

            {/* Custom price override */}
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setShowCustomInput(!showCustomInput)}
                className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 hover:text-primary-600"
              >
                <DollarSign className="w-3.5 h-3.5" />
                {showCustomInput ? "Usar preço da tabela" : "Definir preço manual"}
              </button>
              {showCustomInput && (
                <input
                  type="number"
                  value={newCustomPrice}
                  onChange={(e) => setNewCustomPrice(e.target.value)}
                  className="input-field w-28 text-sm"
                  placeholder="R$ 0.00"
                  step="0.01"
                  min="0"
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              {searchQuery.trim() && (
                <button onClick={handleAddCustom} className="btn-primary text-sm flex-1">
                  Adicionar "{searchQuery.trim()}"
                </button>
              )}
              <button onClick={() => resetAddForm()} className="btn-secondary text-sm">
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

      {/* Checkout modal */}
      {checkoutItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-sm">
            <h3 className="font-semibold mb-1">Marcar como comprado</h3>
            <p className="text-sm text-gray-500 mb-4">
              {checkoutItem.name} — Planejado: {checkoutItem.plannedQty} {checkoutItem.unit}
            </p>

            {/* Mode toggle */}
            <div className="flex mb-3 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
              <button
                onClick={() => setCheckoutMode("unitario")}
                className={`flex-1 py-1.5 text-xs rounded-md transition-colors ${
                  checkoutMode === "unitario"
                    ? "bg-white dark:bg-gray-700 shadow-sm font-medium"
                    : "text-gray-500"
                }`}
              >
                Preço unitário
              </button>
              <button
                onClick={() => setCheckoutMode("total")}
                className={`flex-1 py-1.5 text-xs rounded-md transition-colors ${
                  checkoutMode === "total"
                    ? "bg-white dark:bg-gray-700 shadow-sm font-medium"
                    : "text-gray-500"
                }`}
              >
                Valor total
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Qtde efetiva ({checkoutItem.unit})
                </label>
                <input
                  type="number"
                  value={checkoutActualQty}
                  onChange={(e) => setCheckoutActualQty(e.target.value)}
                  className="input-field"
                  step="0.01"
                  min="0.01"
                  placeholder={checkoutItem.plannedQty.toString()}
                />
              </div>

              {checkoutMode === "unitario" ? (
                <div>
                  <label className="block text-sm font-medium mb-1">Preço unitário (R$/{checkoutItem.unit})</label>
                  <input
                    type="number"
                    value={checkoutUnitPrice}
                    onChange={(e) => setCheckoutUnitPrice(e.target.value)}
                    className="input-field"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                  {checkoutUnitPrice && checkoutActualQty && (
                    <p className="text-xs text-green-600 mt-1">
                      Total: {formatCurrency(parseFloat(checkoutUnitPrice) * (parseFloat(checkoutActualQty) || checkoutItem.plannedQty))}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1">Valor total (R$)</label>
                  <input
                    type="number"
                    value={checkoutTotalValue}
                    onChange={(e) => setCheckoutTotalValue(e.target.value)}
                    className="input-field"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                  {checkoutTotalValue && checkoutActualQty && (
                    <p className="text-xs text-green-600 mt-1">
                      Preço unitário: {formatCurrency(parseFloat(checkoutTotalValue) / (parseFloat(checkoutActualQty) || 1))}/{checkoutItem.unit}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button onClick={handleCheckout} className="btn-primary flex-1">Confirmar</button>
                <button onClick={() => setCheckoutItem(null)} className="btn-secondary">Cancelar</button>
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
                <label className="block text-sm font-medium mb-1">E-mail do participante</label>
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  className="input-field"
                  placeholder="amigo@email.com"
                />
                {shareError && <p className="text-red-500 text-sm mt-1">{shareError}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={handleShare} disabled={!shareEmail.trim()} className="btn-primary flex-1">
                  Convidar
                </button>
                <button
                  onClick={() => { setShowShare(false); setShareError(""); setShareEmail(""); }}
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
