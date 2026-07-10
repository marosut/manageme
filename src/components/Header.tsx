import { memo } from "react";
import { kstTodayText } from "../utils/date";

type HeaderProps = {
  selectedDate: string;
  onSelectedDateChange: (date: string) => void;
  isLoadingUser: boolean;
  authError: string | null;
  onSignOut: () => Promise<void>;
};

export const Header = memo(function Header({
  selectedDate,
  onSelectedDateChange,
  isLoadingUser,
  authError,
  onSignOut,
}: HeaderProps) {
  return (
    <header className="rounded-3xl bg-slate-900 p-5 text-white shadow sm:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">김주완 일정관리</h1>
          <p className="mt-2 text-slate-300">KST 기준 오늘 날짜: {kstTodayText()}</p>
          {(isLoadingUser || authError) && (
            <p className="mt-2 text-sm text-amber-300">
              {isLoadingUser ? "로그인 정보를 불러오는 중입니다." : authError}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div>
            <label className="mb-1 block text-sm text-slate-300" htmlFor="selected-date">
              날짜 선택
            </label>
            <input
              id="selected-date"
              type="date"
              value={selectedDate}
              onChange={(event) => onSelectedDateChange(event.target.value)}
              className="w-full rounded-xl px-4 py-2 text-slate-900 md:w-auto"
            />
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="rounded-xl bg-white px-4 py-2 font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
});
