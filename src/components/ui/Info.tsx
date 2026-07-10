import { memo } from "react";

type InfoProps = {
  label: string;
  value: string;
};

export const Info = memo(function Info({ label, value }: InfoProps) {
  return (
    <div className="rounded-2xl bg-slate-100 p-3 text-center sm:p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold sm:text-2xl">{value}</p>
    </div>
  );
});
