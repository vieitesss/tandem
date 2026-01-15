import TransactionForm from "./transactions/TransactionForm";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-400">Tandem</p>
        <h1 className="text-2xl font-semibold">Add a transaction</h1>
        <p className="text-sm text-slate-400">
          Start with a simple expense to test the loop.
        </p>
      </header>
      <TransactionForm />
    </main>
  );
}
