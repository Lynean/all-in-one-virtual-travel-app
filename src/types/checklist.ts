export interface ChecklistItem {
  text: string;
  checked: boolean;
}

export interface ChecklistCategory {
  category: string;
  items: ChecklistItem[];
}

export interface ChecklistData {
  title: string;
  categories: ChecklistCategory[];
}

export interface ChecklistAppAction {
  type: 'checklist';
  data: ChecklistData;
}
