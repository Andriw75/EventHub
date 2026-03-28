export function getTodayRange() {
  const today = new Date().toISOString().split("T")[0];
  return { inicio: today, fin: today };
}

export function getWeekRange() {
  const now = new Date();
  const first = new Date(now.setDate(now.getDate() - now.getDay()));
  const last = new Date(now.setDate(first.getDate() + 6));

  return {
    inicio: first.toISOString().split("T")[0],
    fin: last.toISOString().split("T")[0],
  };
}

export function getMonthRange() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    inicio: first.toISOString().split("T")[0],
    fin: last.toISOString().split("T")[0],
  };
}
