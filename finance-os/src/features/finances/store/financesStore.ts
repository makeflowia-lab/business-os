import { create } from "zustand";
import {
  Transaction,
  VistaRango,
  GastoMensual,
  GastoAnual,
} from "../types";

interface FinancesState {
  transactions: Transaction[];
  /** Gastos recurrentes mensuales (suscripciones, servicios). */
  gastosMensuales: GastoMensual[];
  /** Gastos recurrentes anuales (dominios, licencias, seguros). */
  gastosAnuales: GastoAnual[];
  kpis: {
    totalIngresos: number;
    totalGastos: number;
    balance: number;
    transaccionesCount: number;
  };
  vista: VistaRango;
  customDateRange: {
    start: Date | null;
    end: Date | null;
  };
  isLoading: boolean;
  error: string | null;
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  removeTransaction: (id: string) => void;
  updateTransaction: (id: string, transaction: Transaction) => void;
  setGastosMensuales: (gastos: GastoMensual[]) => void;
  addGastoMensual: (gasto: GastoMensual) => void;
  updateGastoMensual: (id: string, gasto: GastoMensual) => void;
  removeGastoMensual: (id: string) => void;
  setGastosAnuales: (gastos: GastoAnual[]) => void;
  addGastoAnual: (gasto: GastoAnual) => void;
  updateGastoAnual: (id: string, gasto: GastoAnual) => void;
  removeGastoAnual: (id: string) => void;
  setVista: (vista: VistaRango) => void;
  setCustomDateRange: (start: Date | null, end: Date | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

const calculateKpis = (transactions: Transaction[]) => {
  const incomes = transactions
    .filter((t) => t.tipo === "ingreso")
    .reduce((acc, t) => acc + Number(t.monto), 0);
  const expenses = transactions
    .filter((t) => t.tipo === "gasto")
    .reduce((acc, t) => acc + Number(t.monto), 0);

  return {
    totalIngresos: incomes,
    totalGastos: expenses,
    balance: incomes - expenses,
    transaccionesCount: transactions.length,
  };
};

export const useFinancesStore = create<FinancesState>((set) => ({
  transactions: [],
  gastosMensuales: [],
  gastosAnuales: [],
  kpis: {
    totalIngresos: 0,
    totalGastos: 0,
    balance: 0,
    transaccionesCount: 0,
  },
  vista: "mensual",
  customDateRange: {
    start: null,
    end: null,
  },
  isLoading: false,
  error: null,
  setTransactions: (transactions) =>
    set({
      transactions,
      kpis: calculateKpis(transactions),
    }),
  addTransaction: (t) =>
    set((state) => {
      const next = [t, ...state.transactions];
      return { transactions: next, kpis: calculateKpis(next) };
    }),
  removeTransaction: (id) =>
    set((state) => {
      const next = state.transactions.filter((t) => t.id !== id);
      return { transactions: next, kpis: calculateKpis(next) };
    }),
  updateTransaction: (id, t) =>
    set((state) => {
      const next = state.transactions.map((old) => (old.id === id ? t : old));
      return { transactions: next, kpis: calculateKpis(next) };
    }),
  setGastosMensuales: (gastosMensuales) => set({ gastosMensuales }),
  addGastoMensual: (g) =>
    set((state) => ({ gastosMensuales: [g, ...state.gastosMensuales] })),
  updateGastoMensual: (id, g) =>
    set((state) => ({
      gastosMensuales: state.gastosMensuales.map((old) => (old.id === id ? g : old)),
    })),
  removeGastoMensual: (id) =>
    set((state) => ({
      gastosMensuales: state.gastosMensuales.filter((g) => g.id !== id),
    })),
  setGastosAnuales: (gastosAnuales) => set({ gastosAnuales }),
  addGastoAnual: (g) =>
    set((state) => ({ gastosAnuales: [g, ...state.gastosAnuales] })),
  updateGastoAnual: (id, g) =>
    set((state) => ({
      gastosAnuales: state.gastosAnuales.map((old) => (old.id === id ? g : old)),
    })),
  removeGastoAnual: (id) =>
    set((state) => ({
      gastosAnuales: state.gastosAnuales.filter((g) => g.id !== id),
    })),
  setVista: (vista) => set({ vista }),
  setCustomDateRange: (start, end) => set({ customDateRange: { start, end } }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
