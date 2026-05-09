import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { formatDate, formatCurrency } from "../lib/utils";
import { CheckCircle2, ShoppingBag, TrendingDown } from "lucide-react";

interface HistoricoList {
  id: string;
  title: string;
  createdAt: any;
  estimatedTotal: number;
  actualTotal: number;
  itemCount: number;
  checkedCount: number;
}

export default function History() {
  const { user } = useAuth();
  const [lists, setLists] = useState<HistoricoList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadHistory();
  }, [user]);

  async function loadHistory() {
    const q = query(
      collection(db, "lists"),
      where("participants", "array-contains", user!.uid),
      where("status", "==", "completed"),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);

    const enriched = await Promise.all(
      snap.docs.map(async (listDoc) => {
        const itemsSnap = await getDocs(
          collection(db, "lists", listDoc.id, "items")
        );
        let estimated = 0;
        let actual = 0;
        let checked = 0;
        itemsSnap.forEach((itemDoc) => {
          const d = itemDoc.data();
          estimated += (d.estimatedPrice || 0) * (d.plannedQty || 0);
          actual += (d.actualPrice || 0) * (d.actualQty || 0);
          if (d.checked) checked++;
        });
        return {
          id: listDoc.id,
          title: listDoc.data().title,
          createdAt: listDoc.data().createdAt,
          estimatedTotal: Math.round(estimated * 100) / 100,
          actualTotal: Math.round(actual * 100) / 100,
          itemCount: itemsSnap.size,
          checkedCount: checked,
        };
      })
    );

    setLists(enriched);
    setLoading(false);
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Histórico
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Listas finalizadas e gastos reais.
        </p>
      </div>

      {lists.length === 0 ? (
        <div className="card text-center py-12">
          <ShoppingBag className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400">
            Nenhuma lista finalizada
          </h3>
          <p className="text-gray-400 dark:text-gray-500 mt-1">
            Finalize suas listas de compras para vê-las aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {lists.map((list) => (
            <div key={list.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-5 h-5 text-primary-500" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {list.title}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-400">
                    {formatDate(list.createdAt)} · {list.itemCount} itens ·{" "}
                    {list.checkedCount} comprados
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <div>
                  <span className="text-xs text-gray-400">Estimado</span>
                  <p className="text-lg font-bold text-blue-600">
                    {formatCurrency(list.estimatedTotal)}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">Gasto real</span>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(list.actualTotal)}
                  </p>
                </div>
              </div>
              {list.estimatedTotal > list.actualTotal && list.actualTotal > 0 && (
                <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                  <TrendingDown className="w-4 h-4" />
                  Economia de {formatCurrency(list.estimatedTotal - list.actualTotal)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
