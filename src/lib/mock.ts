import {
  ShoppingBag,
  Coffee,
  Car,
  Home,
  Briefcase,
  Utensils,
  Plane,
  Tv,
  type LucideIcon,
} from "lucide-react";

export type Tx = {
  id: string;
  name: string;
  category: string;
  date: string;
  amount: number;
  type: "income" | "expense";
  icon: LucideIcon;
};

export const transactions: Tx[] = [
  { id: "1", name: "Salary — Acme Inc.", category: "Income", date: "Apr 28", amount: 6800, type: "income", icon: Briefcase },
  { id: "2", name: "Whole Foods Market", category: "Groceries", date: "Apr 27", amount: 142.55, type: "expense", icon: ShoppingBag },
  { id: "3", name: "Blue Bottle Coffee", category: "Dining", date: "Apr 26", amount: 18.4, type: "expense", icon: Coffee },
  { id: "4", name: "Uber rides", category: "Transport", date: "Apr 25", amount: 64.2, type: "expense", icon: Car },
  { id: "5", name: "Rent — April", category: "Housing", date: "Apr 24", amount: 1850, type: "expense", icon: Home },
  { id: "6", name: "Dinner at Nobu", category: "Dining", date: "Apr 22", amount: 215, type: "expense", icon: Utensils },
  { id: "7", name: "Flight to NYC", category: "Travel", date: "Apr 20", amount: 412, type: "expense", icon: Plane },
  { id: "8", name: "Netflix", category: "Subscriptions", date: "Apr 18", amount: 15.99, type: "expense", icon: Tv },
];

export const monthly = [
  { month: "Nov", income: 6200, expenses: 4100 },
  { month: "Dec", income: 7100, expenses: 5200 },
  { month: "Jan", income: 6800, expenses: 4400 },
  { month: "Feb", income: 6900, expenses: 4250 },
  { month: "Mar", income: 7200, expenses: 4900 },
  { month: "Apr", income: 6800, expenses: 4380 },
];

export const wealth = {
  assets: [
    { name: "Checking — Chase", value: 8240, type: "Bank" },
    { name: "Savings — Ally", value: 24500, type: "Bank" },
    { name: "Cash on hand", value: 1200, type: "Cash" },
    { name: "Brokerage — Fidelity", value: 62300, type: "Investment" },
    { name: "Crypto wallet", value: 11800, type: "Investment" },
  ],
  liabilities: [
    { name: "Visa Sapphire", value: 2840, type: "Credit Card" },
    { name: "Amex Gold", value: 1250, type: "Credit Card" },
    { name: "Auto Loan", value: 14200, type: "Loan" },
  ],
};

export const wealthComposition = [
  { name: "Investments", value: 74100 },
  { name: "Bank Accounts", value: 32740 },
  { name: "Cash", value: 1200 },
];

export const budget = [
  { name: "Needs (50%)", actual: 2640, limit: 3400, tone: "primary" },
  { name: "Wants (30%)", actual: 2310, limit: 2040, tone: "destructive" },
  { name: "Savings (20%)", actual: 1100, limit: 1360, tone: "warning" },
];
