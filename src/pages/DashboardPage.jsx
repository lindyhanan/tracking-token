import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Coffee,
  Download,
  GlassWater,
  Loader2,
  Minus,
  Package,
  Plus,
  PlusCircle,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useTokens } from "@/hooks/useTokens";
import AddTokenModal from "@/components/tokens/AddTokenModal";
import CreateTokenTypeModal from "@/components/tokens/CreateTokenTypeModal";
import ReduceModal from "@/components/tokens/ReduceModal";
import { formatTokenLabel, getTokenIcon } from "@/lib/tokenUtils";

// Dashboard hanya menampilkan data dari useTokens (Supabase).
// Tidak ada angka contoh, navigasi otomatis, atau useEffect yang mengubah state.
const LOW_STOCK_LIMIT = 10;
const numberFormatter = new Intl.NumberFormat("id-ID");
const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function number(value) {
  const result = Number(value);
  return Number.isFinite(result) ? Math.max(0, result) : 0;
}

function formatNumber(value) {
  return numberFormatter.format(number(value));
}

function getTokenName(type) {
  return formatTokenLabel(type);
}

function getRemaining(token) {
  return Math.max(0, number(token.total_stock) - number(token.taken_quantity));
}

function getStockStatus(token) {
  const remaining = getRemaining(token);
  if (remaining === 0) return "empty";
  if (remaining <= LOW_STOCK_LIMIT) return "low";
  return "safe";
}

function getStockStatusLabel(status) {
  if (status === "empty") return "Habis";
  if (status === "low") return "Menipis";
  return "Tersedia";
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

function downloadCsv(rows) {
  const headers = [
    "Jenis",
    "Keterangan",
    "Total stok",
    "Diambil",
    "Sisa",
    "Status",
  ];
  const csvEscape = (value) => {
    let text = String(value ?? "");
    // Hindari interpretasi formula saat file dibuka di spreadsheet.
    if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const lines = [
    headers,
    ...rows.map((token) => [
      getTokenName(token.token_type),
      token.description || "",
      number(token.total_stock),
      number(token.taken_quantity),
      getRemaining(token),
      getStockStatusLabel(getStockStatus(token)),
    ]),
  ];
  const csv =
    "\uFEFF" + lines.map((line) => line.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tokentrack-stok-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function MetricCard({
  label,
  value,
  note,
  Icon,
  iconClass = "text-slate-600",
  warning = false,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
            {formatNumber(value)}
          </p>
        </div>
        <div
          className={`rounded-lg border p-2 sm:p-2.5 ${warning ? "border-amber-100 bg-amber-50" : "border-slate-100 bg-slate-50"}`}
        >
          <Icon
            className={`h-4 w-4 sm:h-5 sm:w-5 ${warning ? "text-amber-600" : iconClass}`}
          />
        </div>
      </div>
      <p className="mt-2 text-[11px] sm:text-xs text-slate-500 leading-relaxed">{note}</p>
    </div>
  );
}

function SectionHeading({ title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-3.5 py-3 sm:px-5 sm:py-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[11px] sm:text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function StockStatus({ status }) {
  const styles = {
    safe: "border-emerald-100 bg-emerald-50 text-emerald-700",
    low: "border-amber-100 bg-amber-50 text-amber-700",
    empty: "border-rose-100 bg-rose-50 text-rose-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-medium ${styles[status]}`}
    >
      {getStockStatusLabel(status)}
    </span>
  );
}

function buildActivityChart(history, days) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - days + 1);

  const bucketCount = days === 7 ? 7 : 6;
  const bucketDays = Math.ceil(days / bucketCount);
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const from = new Date(start);
    from.setDate(from.getDate() + index * bucketDays);
    const to = new Date(from);
    to.setDate(to.getDate() + bucketDays - 1);
    const label =
      days === 7
        ? from.toLocaleDateString("id-ID", { day: "numeric", month: "short" })
        : `${from.getDate()}–${to.getDate()} ${to.toLocaleDateString("id-ID", { month: "short" })}`;
    return { name: label, gelas: 0, tumbler: 0 };
  });

  for (const entry of history) {
    if (entry.action_type !== "reduce") continue;
    const date = new Date(entry.performed_at);
    if (Number.isNaN(date.getTime())) continue;
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    const diffDays = Math.round((normalized - start) / 86400000);
    if (diffDays < 0 || diffDays >= days) continue;
    const index = Math.floor(diffDays / bucketDays);
    if (!buckets[index]) continue;
    if (entry.token_type === "glass")
      buckets[index].gelas += number(entry.quantity_changed);
    if (entry.token_type === "tumbler")
      buckets[index].tumbler += number(entry.quantity_changed);
  }
  return buckets;
}

function TypeStockSummary({ title, Icon, total, taken }) {
  const available = Math.max(0, number(total) - number(taken));
  const percent =
    number(total) > 0
      ? Math.min(100, Math.round((available / number(total)) * 100))
      : 0;
  return (
    <div className="rounded-lg border border-slate-100 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
        <Icon className="h-4 w-4 text-slate-500" /> {title}
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-2xl font-semibold tracking-tight text-slate-900">
          {formatNumber(available)}
          <span className="ml-1.5 text-xs font-normal text-slate-500">
            tersisa
          </span>
        </p>
        <span className="text-xs font-medium text-slate-600">{percent}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {formatNumber(taken)} dari {formatNumber(total)} sudah diambil
      </p>
    </div>
  );
}

function ActivityRow({ item }) {
  const isReduce = item.action_type === "reduce";
  const isDelete = item.action_type === "delete";
  const Icon = isDelete ? XCircle : isReduce ? ArrowDownRight : ArrowUpRight;
  const iconStyle = isDelete
    ? "bg-rose-50 text-rose-600"
    : isReduce
      ? "bg-amber-50 text-amber-700"
      : "bg-emerald-50 text-emerald-700";
  const actionLabel = isDelete
    ? "Stok dihapus"
    : isReduce
      ? "Stok diambil"
      : "Stok ditambah";
  return (
    <div className="flex gap-3 border-b border-slate-100 py-3 last:border-b-0">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconStyle}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-slate-800">
            {actionLabel} · {getTokenName(item.token_type)}
          </p>
          <span className="whitespace-nowrap text-xs font-semibold text-slate-700">
            {isReduce || isDelete ? "−" : "+"}
            {formatNumber(item.quantity_changed)}
          </span>
        </div>
        <p className="mt-1 truncate text-xs text-slate-500">
          {item.description ||
            (isReduce ? "Pengambilan stok" : "Perubahan stok")}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          {formatDateTime(item.performed_at)}
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const {
    tokens = [],
    history = [],
    stats,
    loading,
    error,
    fetchTokens,
    fetchHistory,
    addToken,
    reduceToken,
  } = useTokens();

  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [periodDays, setPeriodDays] = useState(30);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [actionError, setActionError] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [createTypeOpen, setCreateTypeOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);

  const availableTypes = useMemo(() => {
    return (stats?.list || []).map((s) => s.type);
  }, [stats?.list]);

  const summary = useMemo(() => {
    const total = tokens.reduce((sum, t) => sum + number(t.total_stock), 0);
    const taken = tokens.reduce((sum, t) => sum + number(t.taken_quantity), 0);
    const remaining = Math.max(0, total - taken);
    const low = tokens.filter((t) => getStockStatus(t) === "low").length;
    const empty = tokens.filter((t) => getStockStatus(t) === "empty").length;
    return { total, taken, remaining, low, empty, needsAttention: low + empty };
  }, [tokens]);

  const filteredTokens = useMemo(() => {
    const q = search.toLowerCase().trim();
    return tokens
      .filter((token) => {
        const matchesSearch =
          !q ||
          getTokenName(token.token_type).toLowerCase().includes(q) ||
          String(token.description || "")
            .toLowerCase()
            .includes(q);
        const matchesStatus =
          stockFilter === "all" || getStockStatus(token) === stockFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => getRemaining(a) - getRemaining(b));
  }, [tokens, search, stockFilter]);

  const recentActivity = useMemo(
    () =>
      [...history]
        .filter((item) => item && item.performed_at)
        .sort((a, b) => new Date(b.performed_at) - new Date(a.performed_at))
        .slice(0, 5),
    [history],
  );

  const chartData = useMemo(
    () => buildActivityChart(history, periodDays),
    [history, periodDays],
  );
  const periodTotal = useMemo(
    () => chartData.reduce((sum, item) => sum + item.gelas + item.tumbler, 0),
    [chartData],
  );

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setActionError("");
    try {
      await Promise.all([fetchTokens(), fetchHistory()]);
      setLastRefreshed(new Date());
    } catch (err) {
      setActionError(err.message || "Gagal memperbarui data");
    } finally {
      setRefreshing(false);
    }
  };

  const handleAdd = async (...args) => {
    setActionError("");
    try {
      const result = await addToken(...args);
      setAddOpen(false);
      setCreateTypeOpen(false);
      return result;
    } catch (err) {
      setActionError(err.message || "Gagal menambahkan stok");
      throw err;
    }
  };

  const handleReduce = async (qty, desc, performedAt) => {
    if (!selectedToken) return null;
    setActionError("");
    try {
      const result = await reduceToken(selectedToken, qty, desc, performedAt || null);
      setSelectedToken(null);
      return result;
    } catch (err) {
      setActionError(err.message || "Gagal mengurangi stok");
      return null;
    }
  };

  const downloadStocks = () => {
    if (!tokens.length) return;
    downloadCsv(filteredTokens);
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Judul dan tindakan utama */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>TokenTrack</span>
            <span>/</span>
            <span>Ringkasan</span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Dashboard
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={refreshing}
            className="gap-2 border-slate-200 bg-white"
            onClick={refresh}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          {/* <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!filteredTokens.length}
            className="gap-2 border-slate-200 bg-white"
            onClick={downloadStocks}
          >
            <Download className="h-4 w-4" /> Ekspor CSV
          </Button> */}

          {/* Tombol Tambah Jenis Token Baru */}
          <Button
            type="button"
            size="sm"
            onClick={() => setCreateTypeOpen(true)}
            className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer shadow-xs"
          >
            <PlusCircle className="h-4 w-4" />
            Tambah Jenis Token
          </Button>

          {/* Tombol Tambah Stok untuk token yang sudah ada */}
          <Button
            type="button"
            size="sm"
            onClick={() => setAddOpen(true)}
            className="gap-2 bg-blue-700 text-white hover:bg-blue-800 cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" /> Tambah Stok
          </Button>
        </div>
      </div>

      {(error || actionError) && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">
              Ada masalah saat memuat atau menyimpan data
            </p>
            <p className="mt-1 text-xs">{actionError || error}</p>
          </div>
          <button
            type="button"
            className="text-xs font-semibold underline"
            onClick={refresh}
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* Ringkasan angka dinamis untuk semua jenis token */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {(stats?.list || []).map((item) => {
          const Icon = getTokenIcon(item.type);
          return (
            <MetricCard
              key={item.type}
              label={`Sisa ${item.label} Saat Ini`}
              value={item.remaining}
              Icon={Icon}
              iconClass="text-blue-600"
              note={`${formatNumber(item.taken)} ${item.label.toLowerCase()} telah diambil (dari ${formatNumber(item.total)} total)`}
            />
          );
        })}
      </div>

      {summary.needsAttention > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              <strong>{summary.needsAttention} catatan stok</strong> perlu
              diperiksa ({summary.empty} habis, {summary.low} menipis).
            </span>
          </div>
          <button
            type="button"
            className="text-xs font-semibold text-amber-900 underline"
            onClick={() => {
              setStockFilter("low");
              setSearch("");
            }}
          >
            Lihat stok menipis
          </button>
        </div>
      )}

      {loading && tokens.length === 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Mengambil data dari
          Supabase...
        </div>
      )}

            <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
        <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white xl:col-span-2">
          <SectionHeading
            title="Daftar persediaan"
            subtitle="Diurutkan dari sisa stok paling sedikit"
            action={
              <Link
                to="/tokens"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
              >
                Lihat semua <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="flex flex-wrap items-center gap-2 p-4">
            <div className="relative min-w-[160px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari jenis atau keterangan..."
                aria-label="Cari stok"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
              {[
                { key: "all", label: "Semua" },
                { key: "low", label: "Menipis" },
                { key: "empty", label: "Habis" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStockFilter(item.key)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${stockFilter === item.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[610px] text-left text-xs">
              <thead className="border-y border-slate-100 bg-slate-50 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Jenis / keterangan</th>
                  <th className="px-3 py-3 text-right font-medium">Total</th>
                  <th className="px-3 py-3 text-right font-medium">Diambil</th>
                  <th className="px-3 py-3 text-right font-medium">Sisa</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredTokens.slice(0, 6).map((token) => {
                  const status = getStockStatus(token);
                  const remaining = getRemaining(token);
                  return (
                    <tr
                      key={token.id}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                    >
                      <td className="max-w-[220px] px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                            {token.token_type === "tumbler" ? (
                              <Coffee className="h-4 w-4" />
                            ) : (
                              <GlassWater className="h-4 w-4" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800">
                              {getTokenName(token.token_type)}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-slate-500">
                              {token.description || "Tanpa keterangan"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-700">
                        {formatNumber(token.total_stock)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-700">
                        {formatNumber(token.taken_quantity)}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-900">
                        {formatNumber(remaining)}
                      </td>
                      <td className="px-3 py-3">
                        <StockStatus status={status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={remaining <= 0}
                          onClick={() => setSelectedToken(token)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Minus className="h-3 w-3" /> Ambil
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!filteredTokens.length && (
              <div className="px-6 py-12 text-center">
                <Package className="mx-auto mb-2 h-7 w-7 text-slate-300" />
                <p className="text-sm font-medium text-slate-700">
                  Tidak ada stok yang sesuai
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Ubah pencarian atau filter untuk melihat data lain.
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            <span>
              Menampilkan {Math.min(6, filteredTokens.length)} dari{" "}
              {filteredTokens.length} catatan
            </span>
            <span>
              {lastRefreshed
                ? `Diperbarui ${formatDateTime(lastRefreshed)}`
                : "Data tersambung melalui Supabase"}
            </span>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <SectionHeading
            title="Aktivitas terbaru"
            subtitle="Lima transaksi terakhir"
            action={
              <Link
                to="/history"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
              >
                Riwayat <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="px-4">
            {recentActivity.length ? (
              recentActivity.map((item, index) => (
                <ActivityRow
                  key={item.id || `${item.token_id}-${index}`}
                  item={item}
                />
              ))
            ) : (
              <div className="flex min-h-[230px] flex-col items-center justify-center text-center">
                <Clock3 className="mb-3 h-7 w-7 text-slate-300" />
                <p className="text-sm font-medium text-slate-700">
                  Belum ada aktivitas
                </p>
                <p className="mt-1 max-w-[240px] text-xs text-slate-500">
                  Penambahan dan pengambilan stok akan tercatat di sini jika
                  riwayat tersedia di database.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Grafik aktivitas dan posisi stok */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white xl:col-span-2">
          <SectionHeading
            title="Tren pengambilan"
            subtitle={`Total ${formatNumber(periodTotal)} token diambil selama ${periodDays} hari terakhir`}
            action={
              <select
                aria-label="Periode grafik"
                value={periodDays}
                onChange={(e) => setPeriodDays(Number(e.target.value))}
                className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value={7}>7 hari</option>
                <option value={30}>30 hari</option>
                <option value={90}>90 hari</option>
              </select>
            }
          />
          <div className="px-3 pb-4 pt-5 sm:px-5">
            {periodTotal === 0 ? (
              <div className="flex h-56 flex-col items-center justify-center text-center">
                <Activity className="mb-3 h-7 w-7 text-slate-300" />
                <p className="text-sm font-medium text-slate-700">
                  Belum ada pengambilan pada periode ini
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Grafik akan muncul setelah aktivitas tersimpan.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={245}>
                <BarChart
                  data={chartData}
                  margin={{ top: 6, right: 6, bottom: 0, left: -12 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="#e2e8f0"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                  />
                  <Tooltip
                    formatter={(value, name) => [formatNumber(value), name]}
                    contentStyle={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                  />
                  <Bar
                    dataKey="gelas"
                    name="Gelas"
                    fill="#2563eb"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    dataKey="tumbler"
                    name="Tumbler"
                    fill="#94a3b8"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <SectionHeading
            title="Ketersediaan per jenis"
            subtitle="Persentase stok yang masih tersedia"
          />
          <div className="space-y-3 p-4">
            {(stats?.list || []).map((item) => {
              const Icon = getTokenIcon(item.type);
              return (
                <TypeStockSummary
                  key={item.type}
                  title={item.label}
                  Icon={Icon}
                  total={item.total ?? 0}
                  taken={item.taken ?? 0}
                />
              );
            })}
            <p className="px-1 text-[11px] text-slate-400">
              Batas stok menipis: {LOW_STOCK_LIMIT} unit atau kurang.
            </p>
          </div>
        </section>
      </div>

      {/* Tabel stok + aktivitas terbaru */}


      {/* Modal Tambah Stok */}
      <AddTokenModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAdd}
        availableTypes={availableTypes}
      />

      {/* Modal Tambah Jenis Token Baru */}
      <CreateTokenTypeModal
        open={createTypeOpen}
        onClose={() => setCreateTypeOpen(false)}
        onSubmit={handleAdd}
      />

      <ReduceModal
        token={selectedToken}
        open={Boolean(selectedToken)}
        onClose={() => setSelectedToken(null)}
        onSubmit={handleReduce}
      />
    </div>
  );
}
