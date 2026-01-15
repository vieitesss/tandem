import Link from "next/link";
import TransactionForm from "./transactions/TransactionForm";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-6 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-400">Tandem</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">Add a transaction</h1>
          <div className="hidden items-center gap-2 text-slate-300 md:flex">
            <Link
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 hover:border-slate-500"
              href="/transactions"
              aria-label="View transactions"
              title="View transactions"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M5 4.75a.75.75 0 00-.75.75v9.5a.75.75 0 00.75.75h10a.75.75 0 00.75-.75V5.5a.75.75 0 00-.75-.75H5zm1.75 2h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 010-1.5zm0 3h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 010-1.5zm0 3h4a.75.75 0 010 1.5h-4a.75.75 0 010-1.5z" />
              </svg>
            </Link>
            <Link
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 hover:border-slate-500"
              href="/profiles"
              aria-label="Manage profiles"
              title="Manage profiles"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M10 10a3 3 0 100-6 3 3 0 000 6z" />
                <path d="M4.5 16a5.5 5.5 0 0111 0v.5h-11V16z" />
              </svg>
            </Link>
          </div>
        </div>
        <p className="text-sm text-slate-400">
          Start with a simple expense to test the loop.
        </p>
      </header>
      <TransactionForm />
    </main>
  );
}
