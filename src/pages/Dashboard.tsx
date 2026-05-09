import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { formatCurrency } from "../lib/utils";
import { BarChart3, TrendingUp, ShoppingBasket, DollarSign } from "lucide-react";

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadStats();
  }, [user]);

  async function loadStats() {
    const listsRef = collection(db, "lists");
    const q = query(
      listsRef,
      where("participants", "array-contains", user!.uid),
      where("status", "==", "completed"),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);
    const lists = snap.docs.map((d) => ({ id: d.id, ...d.data() } as { id: string; createdAt?: any; [key: string]: any }));

    let totalEstimated = 0;
    let totalActual = 0;
    let totalLists = lists.length;
    const productCount: Record<string, number> = {};
    const qtyHistogram: Record<string, number> = { "0-1": 0, "1-3": 0, "3-5": 0, "5+": 0 };
    const monthlySpending: Record<string, number> = {};

    for (const list of lists) {
      const itemsSnap = await getDocs(collection(db, "lists", list.id as string, "items"));
      const items = itemsSnap.docs.map((d) => d.data());

      for (const item of items) {
        totalEstimated += (item.estimatedPrice || 0) * (item.plannedQty || 0);
        totalActual += (item.actualPrice || 0) * (item.actualQty || 0);

        const name = (item.name || "").toLowerCase().trim();
        productCount[name] = (productCount[name] || 0) + 1;

        const qty = item.actualQty || item.plannedQty || 0;
        if (qty <= 1) qtyHistogram["0-1"]++;
        else if (qty <= 3) qtyHistogram["1-3"]++;
        else if (qty <= 5) qtyHistogram["3-5"]++;
        else qtyHistogram["5+"]++;
      }

      const date = list.createdAt?.toDate?.() || new Date();
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthlySpending[key] = (monthlySpending[key] || 0) + totalActual;
    }

    const topProducts = Object.entries(productCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value: count }));

    const monthlyData = Object.entries(monthlySpending)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([key, value]) => ({ month: key, gasto: Math.round(value * 100) / 100 }));

    setStats({
      totalLists,
      totalEstimated: Math.round(totalEstimated * 100) / 100,
      totalActual: Math.round(totalActual * 100) / 100,
      topProducts,
      monthlyData,
      qtyHistogram: Object.entries(qtyHistogram).map(([k, v]) => ({ name: k, value: v })),
    });
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  const statCards = [
    {
      label: "Listas Finalizadas",
      value: stats?.totalLists || 0,
      icon: ShoppingBasket,
      color: "text-primary-600 bg-primary-100 dark:bg-primary-950",
    },
    {
      label: "Gasto Estimado",
      value: formatCurrency(stats?.totalEstimated || 0),
      icon: TrendingUp,
      color: "text-blue-600 bg-blue-100 dark:bg-blue-950",
    },
    {
      label: "Gasto Real",
      value: formatCurrency(stats?.totalActual || 0),
      icon: DollarSign,
      color: "text-amber-600 bg-amber-100 dark:bg-amber-950",
    },
    {
      label: "Economia",
      value: formatCurrency(
        Math.max(0, (stats?.totalEstimated || 0) - (stats?.totalActual || 0))
      ),
      icon: BarChart3,
      color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Análise de gastos e histórico de compras.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="card flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${card.color}`}>
              <card.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      {(!stats || stats.totalLists === 0) ? (
        <div className="card text-center py-12">
          <BarChart3 className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400">
            Nenhum dado ainda
          </h3>
          <p className="text-gray-400 dark:text-gray-500 mt-1">
            Finalize uma lista de compras para ver os gráficos aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly spending */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Gastos Mensais (Reais)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.monthlyData}>
                <XAxis dataKey="month" stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "Gasto"]}
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "none",
                    borderRadius: "12px",
                    color: "#f9fafb",
                  }}
                />
                <Bar dataKey="gasto" fill="#22c55e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top products */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Produtos Mais Comprados</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={stats.topProducts}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {stats.topProducts.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
