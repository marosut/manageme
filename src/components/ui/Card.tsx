import { memo, type ReactNode } from "react";

type CardProps = {
  title: string;
  children: ReactNode;
};

export const Card = memo(function Card({ title, children }: CardProps) {
  return (
    <section className="w-full min-w-0 overflow-hidden rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
      <h2 className="mb-4 text-lg font-bold sm:text-xl">{title}</h2>
      {children}
    </section>
  );
});
