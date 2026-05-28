const DEFAULT_CATEGORIES = ['CSE', 'SSC GD', 'Agniveer', 'Railway', 'WBP', 'Nursing'];
const KEY = 'admin_custom_categories';

export function getCategories() {
  try {
    const saved = localStorage.getItem(KEY);
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export function addCategory(name) {
  const trimmed = name.trim();
  if (!trimmed) return getCategories();
  const cats = getCategories();
  if (cats.map(c => c.toLowerCase()).includes(trimmed.toLowerCase())) return cats;
  const updated = [...cats, trimmed];
  localStorage.setItem(KEY, JSON.stringify(updated));
  return updated;
}

export function removeCategory(name) {
  const updated = getCategories().filter(c => c !== name);
  localStorage.setItem(KEY, JSON.stringify(updated));
  return updated;
}

export function resetCategories() {
  localStorage.removeItem(KEY);
  return DEFAULT_CATEGORIES;
}
