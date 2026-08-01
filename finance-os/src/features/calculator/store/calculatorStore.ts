import { create } from 'zustand'
import { FinancialInputs, DEFAULT_INPUTS, CalculatedMetrics } from '../types'
import { calculateMetrics } from '../services/calculator'

interface CalculatorState {
  currentStep: number
  inputs: FinancialInputs
  metrics: CalculatedMetrics | null
  setInputs: (inputs: Partial<FinancialInputs>) => void
  nextStep: () => void
  prevStep: () => void
  calculate: () => void
  reset: () => void
}

export const useCalculatorStore = create<CalculatorState>((set, get) => ({
  currentStep: 1,
  inputs: DEFAULT_INPUTS,
  metrics: null,
  setInputs: (newInputs) => set((state) => ({ 
    inputs: { ...state.inputs, ...newInputs } 
  })),
  nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 4) })),
  prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),
  calculate: () => {
    const metrics = calculateMetrics(get().inputs)
    set({ metrics })
  },
  reset: () => set({ currentStep: 1, inputs: DEFAULT_INPUTS, metrics: null })
}))
