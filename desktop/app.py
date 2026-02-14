#!/usr/bin/env python3
import json
import os
import uuid
from dataclasses import dataclass
from datetime import date, datetime, timedelta
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

INDEX_FILE = os.path.join(os.path.dirname(__file__), "index.json")
CYCLE_DATA_FILENAME = "cycle_data.json"
STATUS_VALUES = ["NOT_STARTED", "IN_PROGRESS", "DONE"]
STATUS_LABEL = {
    "NOT_STARTED": "시작 전",
    "IN_PROGRESS": "진행 중",
    "DONE": "완료",
}
PALETTE = {
    "bg": "#f3f7fb",
    "surface": "#ffffff",
    "ink": "#10243f",
    "muted": "#5f738d",
    "accent": "#0ea5e9",
    "accent_soft": "#e0f2fe",
    "line": "#d8e4f0",
}


@dataclass
class Store:
    index: dict

    @classmethod
    def load(cls):
        if not os.path.exists(INDEX_FILE):
            return cls({"cycles": [], "selected_cycle_id": None})
        with open(INDEX_FILE, "r", encoding="utf-8") as f:
            return cls(json.load(f))

    def save_index(self):
        with open(INDEX_FILE, "w", encoding="utf-8") as f:
            json.dump(self.index, f, ensure_ascii=False, indent=2)

    def uid(self, prefix):
        return f"{prefix}_{uuid.uuid4().hex[:10]}"

    def selected_cycle_id(self):
        return self.index.get("selected_cycle_id")

    def cycles(self):
        return self.index.get("cycles", [])

    def set_selected_cycle(self, cycle_id):
        self.index["selected_cycle_id"] = cycle_id
        self.save_index()

    def get_cycle_meta(self, cycle_id=None):
        target_id = cycle_id or self.selected_cycle_id()
        if not target_id:
            return None
        return next((c for c in self.cycles() if c["id"] == target_id), None)

    def cycle_file_path(self, cycle_meta):
        return os.path.join(cycle_meta["folder_path"], CYCLE_DATA_FILENAME)

    def load_cycle_data(self, cycle_id=None):
        cycle_meta = self.get_cycle_meta(cycle_id)
        if not cycle_meta:
            return {"goals": [], "works": [], "tasks": []}

        file_path = self.cycle_file_path(cycle_meta)
        if not os.path.exists(file_path):
            data = {
                "id": cycle_meta["id"],
                "name": cycle_meta["name"],
                "created_at": cycle_meta["created_at"],
                "goals": [],
                "works": [],
                "tasks": [],
            }
            self.write_cycle_data(cycle_meta, data)
            return data

        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        data.setdefault("goals", [])
        data.setdefault("works", [])
        data.setdefault("tasks", [])
        data.setdefault("id", cycle_meta["id"])
        data.setdefault("name", cycle_meta["name"])
        data.setdefault("created_at", cycle_meta["created_at"])
        return data

    def write_cycle_data(self, cycle_meta, data):
        os.makedirs(cycle_meta["folder_path"], exist_ok=True)
        with open(self.cycle_file_path(cycle_meta), "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def create_cycle(self, name, parent_dir):
        cycle_id = self.uid("cycle")
        safe_name = "".join(ch if ch.isalnum() or ch in ("-", "_") else "_" for ch in name).strip("_") or "cycle"
        cycle_dir = os.path.join(parent_dir, f"{safe_name}_{cycle_id[-6:]}")
        os.makedirs(cycle_dir, exist_ok=False)

        cycle_meta = {
            "id": cycle_id,
            "name": name,
            "created_at": datetime.now().isoformat(),
            "folder_path": os.path.abspath(cycle_dir),
        }

        cycle_data = {
            "id": cycle_meta["id"],
            "name": cycle_meta["name"],
            "created_at": cycle_meta["created_at"],
            "goals": [],
            "works": [],
            "tasks": [],
        }

        self.write_cycle_data(cycle_meta, cycle_data)
        self.index.setdefault("cycles", []).append(cycle_meta)
        if not self.selected_cycle_id():
            self.index["selected_cycle_id"] = cycle_id
        self.save_index()

    def import_cycle(self, cycle_folder):
        cycle_folder = os.path.abspath(cycle_folder)
        file_path = os.path.join(cycle_folder, CYCLE_DATA_FILENAME)
        if not os.path.exists(file_path):
            raise ValueError(f"{CYCLE_DATA_FILENAME} 파일이 없습니다.")

        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if not data.get("id"):
            data["id"] = self.uid("cycle")
        if not data.get("name"):
            data["name"] = os.path.basename(cycle_folder)
        if not data.get("created_at"):
            data["created_at"] = datetime.now().isoformat()
        data.setdefault("goals", [])
        data.setdefault("works", [])
        data.setdefault("tasks", [])

        existing = self.get_cycle_meta(data["id"])
        if existing:
            existing["name"] = data["name"]
            existing["folder_path"] = cycle_folder
            existing["created_at"] = data["created_at"]
            cycle_meta = existing
        else:
            cycle_meta = {
                "id": data["id"],
                "name": data["name"],
                "created_at": data["created_at"],
                "folder_path": cycle_folder,
            }
            self.index.setdefault("cycles", []).append(cycle_meta)

        self.write_cycle_data(cycle_meta, data)
        self.index["selected_cycle_id"] = cycle_meta["id"]
        self.save_index()

    def goals(self):
        return self.load_cycle_data().get("goals", [])

    def works(self):
        return self.load_cycle_data().get("works", [])

    def tasks(self):
        return self.load_cycle_data().get("tasks", [])

    def mutate_cycle_data(self, mutator):
        cycle_meta = self.get_cycle_meta()
        if not cycle_meta:
            return
        data = self.load_cycle_data(cycle_meta["id"])
        mutator(data)
        self.write_cycle_data(cycle_meta, data)

    def create_goal(self, title, start_date, end_date):
        def _apply(data):
            data["goals"].append({
                "id": self.uid("goal"),
                "title": title,
                "start_date": start_date or "",
                "end_date": end_date or "",
            })

        self.mutate_cycle_data(_apply)

    def create_work(self, title, goal_id, start_date, end_date):
        def _apply(data):
            data["works"].append({
                "id": self.uid("work"),
                "goal_id": goal_id or "",
                "title": title,
                "status": "NOT_STARTED",
                "start_date": start_date or "",
                "end_date": end_date or "",
            })

        self.mutate_cycle_data(_apply)

    def create_task(self, title, work_id, due_date):
        def _apply(data):
            data["tasks"].append({
                "id": self.uid("task"),
                "work_id": work_id,
                "title": title,
                "done": False,
                "due_date": due_date or "",
            })

        self.mutate_cycle_data(_apply)

    def update_work_status(self, work_id, status):
        def _apply(data):
            for work in data["works"]:
                if work["id"] == work_id:
                    work["status"] = status
                    break

        self.mutate_cycle_data(_apply)

    def toggle_task(self, task_id):
        def _apply(data):
            for task in data["tasks"]:
                if task["id"] == task_id:
                    task["done"] = not task["done"]
                    break

        self.mutate_cycle_data(_apply)


def compute_goal_status(works):
    if not works:
        return "NOT_STARTED"
    if all(w["status"] == "NOT_STARTED" for w in works):
        return "NOT_STARTED"
    if all(w["status"] == "DONE" for w in works):
        return "DONE"
    return "IN_PROGRESS"


def compute_goal_progress(works):
    if not works:
        return 0
    done = len([w for w in works if w["status"] == "DONE"])
    return int((done / len(works)) * 100)


def cycle_display_name(cycle):
    return f"{cycle['name']} | {cycle['id'][-6:]}"


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Cycle Planner Desktop")
        self.geometry("1280x800")
        self.minsize(1050, 680)
        self.configure(bg=PALETTE["bg"])

        self.store = Store.load()
        self.hide_completed_goal = tk.BooleanVar(value=False)
        self.hide_completed_todo = tk.BooleanVar(value=False)
        self.work_status_var = tk.StringVar(value="NOT_STARTED")
        self.cycle_parent_dir = tk.StringVar(value=os.path.expanduser("~"))

        self._setup_theme()
        self._build_header()
        self._build_tabs()
        self.refresh_all()

    def _setup_theme(self):
        style = ttk.Style(self)
        style.theme_use("clam")

        default_font = ("Segoe UI", 10)
        style.configure(".", font=default_font)
        style.configure("Root.TFrame", background=PALETTE["bg"])
        style.configure("Header.TFrame", background=PALETTE["surface"])
        style.configure("HeaderTitle.TLabel", background=PALETTE["surface"], foreground=PALETTE["ink"], font=("Segoe UI", 14, "bold"))
        style.configure("HeaderSub.TLabel", background=PALETTE["surface"], foreground=PALETTE["muted"])
        style.configure("Muted.TLabel", background=PALETTE["surface"], foreground=PALETTE["muted"])

        style.configure("Accent.TButton", background=PALETTE["accent"], foreground="#ffffff", borderwidth=0, padding=(10, 6))
        style.map("Accent.TButton", background=[("active", "#0284c7"), ("pressed", "#0369a1")])

        style.configure("Soft.TButton", background=PALETTE["accent_soft"], foreground=PALETTE["ink"], bordercolor=PALETTE["line"], padding=(10, 6))
        style.map("Soft.TButton", background=[("active", "#bae6fd")])

        style.configure("TNotebook", background=PALETTE["bg"], borderwidth=0)
        style.configure("TNotebook.Tab", padding=(14, 8), background="#dbeafe", foreground="#244264")
        style.map("TNotebook.Tab", background=[("selected", PALETTE["surface"])], foreground=[("selected", PALETTE["ink"])])

        style.configure("TLabelframe", background=PALETTE["surface"], bordercolor=PALETTE["line"], borderwidth=1, relief="solid")
        style.configure("TLabelframe.Label", background=PALETTE["surface"], foreground=PALETTE["ink"], font=("Segoe UI", 10, "bold"))
        style.configure("TLabel", background=PALETTE["bg"], foreground=PALETTE["ink"])
        style.configure("TEntry", fieldbackground=PALETTE["surface"], bordercolor=PALETTE["line"], padding=5)
        style.configure("TCombobox", fieldbackground=PALETTE["surface"], bordercolor=PALETTE["line"])
        style.configure("TCheckbutton", background=PALETTE["bg"])

        style.configure("Treeview", background=PALETTE["surface"], fieldbackground=PALETTE["surface"], bordercolor=PALETTE["line"], rowheight=28)
        style.configure("Treeview.Heading", background="#e2edf8", foreground=PALETTE["ink"], font=("Segoe UI", 10, "bold"))

    def _build_header(self):
        outer = ttk.Frame(self, style="Root.TFrame", padding=(12, 12, 12, 8))
        outer.pack(fill="x")

        header = ttk.Frame(outer, style="Header.TFrame", padding=10)
        header.pack(fill="x")

        title_row = ttk.Frame(header, style="Header.TFrame")
        title_row.pack(fill="x", pady=(0, 8))
        ttk.Label(title_row, text="Cycle Planner", style="HeaderTitle.TLabel").pack(side="left")
        ttk.Label(title_row, text="로컬 폴더 기반 일정 관리", style="HeaderSub.TLabel").pack(side="left", padx=10)

        controls = ttk.Frame(header, style="Header.TFrame")
        controls.pack(fill="x")

        ttk.Label(controls, text="Cycle", style="HeaderSub.TLabel").pack(side="left")

        self.cycle_combo = ttk.Combobox(controls, width=32, state="readonly")
        self.cycle_combo.pack(side="left", padx=8)
        self.cycle_combo.bind("<<ComboboxSelected>>", self.on_cycle_select)

        self.new_cycle_name = tk.StringVar()
        ttk.Entry(controls, textvariable=self.new_cycle_name, width=22).pack(side="left", padx=4)
        ttk.Button(controls, text="저장 폴더 선택", command=self.pick_cycle_parent_dir, style="Soft.TButton").pack(side="left", padx=4)
        ttk.Button(controls, text="Cycle 생성", command=self.create_cycle, style="Accent.TButton").pack(side="left", padx=4)
        ttk.Button(controls, text="Cycle 불러오기", command=self.import_cycle, style="Soft.TButton").pack(side="left", padx=4)

        self.folder_label = ttk.Label(controls, text="", style="Muted.TLabel")
        self.folder_label.pack(side="left", padx=10)

    def _build_tabs(self):
        self.notebook = ttk.Notebook(self)
        self.notebook.pack(fill="both", expand=True, padx=12, pady=(0, 12))

        self.goal_tab = ttk.Frame(self.notebook)
        self.calendar_tab = ttk.Frame(self.notebook)
        self.todo_tab = ttk.Frame(self.notebook)

        self.notebook.add(self.goal_tab, text="Goal List")
        self.notebook.add(self.calendar_tab, text="캘린더")
        self.notebook.add(self.todo_tab, text="To-Do List")

        self._build_goal_tab()
        self._build_calendar_tab()
        self._build_todo_tab()

    def _build_goal_tab(self):
        container = ttk.Frame(self.goal_tab, style="Root.TFrame", padding=10)
        container.pack(fill="both", expand=True)

        top = ttk.Frame(container)
        top.pack(fill="x")
        ttk.Checkbutton(top, text="완료된 항목들 가리기", variable=self.hide_completed_goal, command=self.refresh_goal_tree).pack(side="right")

        forms = ttk.Frame(container, style="Root.TFrame")
        forms.pack(fill="x", pady=8)

        goal_box = ttk.LabelFrame(forms, text="Goal 생성", padding=10)
        goal_box.pack(side="left", fill="x", expand=True, padx=4)
        self.goal_title = tk.StringVar()
        self.goal_start = tk.StringVar()
        self.goal_end = tk.StringVar()
        ttk.Entry(goal_box, textvariable=self.goal_title).pack(fill="x", pady=2)
        ttk.Entry(goal_box, textvariable=self.goal_start).pack(fill="x", pady=2)
        ttk.Entry(goal_box, textvariable=self.goal_end).pack(fill="x", pady=2)
        ttk.Label(goal_box, text="날짜 형식: YYYY-MM-DD").pack(anchor="w")
        ttk.Button(goal_box, text="Goal 추가", command=self.create_goal).pack(anchor="e", pady=3)

        work_box = ttk.LabelFrame(forms, text="Work 생성", padding=10)
        work_box.pack(side="left", fill="x", expand=True, padx=4)
        self.work_title = tk.StringVar()
        self.work_goal = tk.StringVar()
        self.work_start = tk.StringVar()
        self.work_end = tk.StringVar()
        ttk.Entry(work_box, textvariable=self.work_title).pack(fill="x", pady=2)
        self.work_goal_combo = ttk.Combobox(work_box, textvariable=self.work_goal, state="readonly")
        self.work_goal_combo.pack(fill="x", pady=2)
        ttk.Entry(work_box, textvariable=self.work_start).pack(fill="x", pady=2)
        ttk.Entry(work_box, textvariable=self.work_end).pack(fill="x", pady=2)
        ttk.Button(work_box, text="Work 추가", command=self.create_work).pack(anchor="e", pady=3)

        task_box = ttk.LabelFrame(forms, text="Task 생성", padding=10)
        task_box.pack(side="left", fill="x", expand=True, padx=4)
        self.task_title = tk.StringVar()
        self.task_work = tk.StringVar()
        self.task_due = tk.StringVar()
        ttk.Entry(task_box, textvariable=self.task_title).pack(fill="x", pady=2)
        self.task_work_combo = ttk.Combobox(task_box, textvariable=self.task_work, state="readonly")
        self.task_work_combo.pack(fill="x", pady=2)
        ttk.Entry(task_box, textvariable=self.task_due).pack(fill="x", pady=2)
        ttk.Button(task_box, text="Task 추가", command=self.create_task).pack(anchor="e", pady=3)

        self.goal_tree = ttk.Treeview(container, columns=("type", "status", "start", "end", "due", "progress"), show="tree headings")
        self.goal_tree.heading("#0", text="제목")
        self.goal_tree.heading("type", text="타입")
        self.goal_tree.heading("status", text="상태")
        self.goal_tree.heading("start", text="시작일")
        self.goal_tree.heading("end", text="완료일")
        self.goal_tree.heading("due", text="Task 완료일")
        self.goal_tree.heading("progress", text="진행률")
        self.goal_tree.column("#0", width=380)
        self.goal_tree.column("type", width=90, anchor="center")
        self.goal_tree.column("status", width=100, anchor="center")
        self.goal_tree.column("start", width=110, anchor="center")
        self.goal_tree.column("end", width=110, anchor="center")
        self.goal_tree.column("due", width=110, anchor="center")
        self.goal_tree.column("progress", width=90, anchor="center")
        self.goal_tree.pack(fill="both", expand=True, pady=(8, 4))

        action = ttk.Frame(container)
        action.pack(fill="x")
        ttk.Label(action, text="선택 Work 상태 변경:").pack(side="left")
        ttk.Combobox(action, textvariable=self.work_status_var, state="readonly", values=STATUS_VALUES, width=14).pack(side="left", padx=4)
        ttk.Button(action, text="적용", command=self.change_selected_work_status).pack(side="left", padx=4)
        ttk.Button(action, text="선택 Task 완료 토글", command=self.toggle_selected_task).pack(side="left", padx=10)

    def _build_calendar_tab(self):
        frame = ttk.Frame(self.calendar_tab, style="Root.TFrame", padding=10)
        frame.pack(fill="both", expand=True)

        toolbar = ttk.Frame(frame)
        toolbar.pack(fill="x")
        self.month_offset = 0
        self.month_label = ttk.Label(toolbar, text="", font=("Arial", 12, "bold"))
        ttk.Button(toolbar, text="< 이전", command=lambda: self.shift_month(-1)).pack(side="left")
        ttk.Button(toolbar, text="다음 >", command=lambda: self.shift_month(1)).pack(side="left", padx=4)
        self.month_label.pack(side="left", padx=8)

        self.calendar_tree = ttk.Treeview(frame, columns=("date", "item", "state"), show="headings")
        self.calendar_tree.heading("date", text="날짜")
        self.calendar_tree.heading("item", text="항목")
        self.calendar_tree.heading("state", text="상태")
        self.calendar_tree.column("date", width=120, anchor="center")
        self.calendar_tree.column("item", width=780)
        self.calendar_tree.column("state", width=100, anchor="center")
        self.calendar_tree.tag_configure("active", background="#d7f0ff")
        self.calendar_tree.tag_configure("done", background="#ececec")
        self.calendar_tree.pack(fill="both", expand=True, pady=8)

    def _build_todo_tab(self):
        frame = ttk.Frame(self.todo_tab, style="Root.TFrame", padding=10)
        frame.pack(fill="both", expand=True)

        top = ttk.Frame(frame)
        top.pack(fill="x")
        ttk.Checkbutton(top, text="완료된 항목들 가리기", variable=self.hide_completed_todo, command=self.refresh_todo_tree).pack(side="right")

        self.todo_tree = ttk.Treeview(frame, columns=("due", "status"), show="tree headings")
        self.todo_tree.heading("#0", text="Work / Task")
        self.todo_tree.heading("due", text="완료일")
        self.todo_tree.heading("status", text="상태")
        self.todo_tree.column("#0", width=700)
        self.todo_tree.column("due", width=130, anchor="center")
        self.todo_tree.column("status", width=120, anchor="center")
        self.todo_tree.pack(fill="both", expand=True, pady=8)

        ttk.Button(frame, text="선택 Task 완료 토글", command=self.toggle_selected_task).pack(anchor="e")

    def pick_cycle_parent_dir(self):
        picked = filedialog.askdirectory(initialdir=self.cycle_parent_dir.get() or os.path.expanduser("~"), title="새 Cycle 저장 상위 폴더 선택")
        if picked:
            self.cycle_parent_dir.set(picked)
            self.update_folder_label()

    def update_folder_label(self):
        text = f"저장 상위 폴더: {self.cycle_parent_dir.get()}"
        if len(text) > 80:
            text = text[:77] + "..."
        self.folder_label.config(text=text)

    def on_cycle_select(self, _event=None):
        selected = self.cycle_combo.get()
        cycles = self.store.cycles()
        target = next((c for c in cycles if cycle_display_name(c) == selected), None)
        if target:
            self.store.set_selected_cycle(target["id"])
            if target.get("folder_path"):
                parent_dir = os.path.dirname(target["folder_path"])
                if parent_dir:
                    self.cycle_parent_dir.set(parent_dir)
            self.refresh_all()

    def refresh_cycle_selector(self):
        cycles = self.store.cycles()
        labels = [cycle_display_name(c) for c in cycles]
        self.cycle_combo["values"] = labels

        selected_id = self.store.selected_cycle_id()
        selected_cycle = self.store.get_cycle_meta(selected_id)
        if selected_cycle:
            self.cycle_combo.set(cycle_display_name(selected_cycle))
        elif labels:
            self.cycle_combo.set(labels[0])
            self.on_cycle_select()
        else:
            self.cycle_combo.set("")

    def refresh_form_options(self):
        goals = self.store.goals()
        works = self.store.works()

        goal_values = ["(미연결)"] + [f"{g['title']}|{g['id']}" for g in goals]
        self.work_goal_combo["values"] = goal_values
        if self.work_goal.get() not in goal_values:
            self.work_goal.set(goal_values[0] if goal_values else "")

        work_values = [f"{w['title']}|{w['id']}" for w in works]
        self.task_work_combo["values"] = work_values
        if self.task_work.get() not in work_values:
            self.task_work.set(work_values[0] if work_values else "")

    def refresh_goal_tree(self):
        for node in self.goal_tree.get_children():
            self.goal_tree.delete(node)

        goals = self.store.goals()
        works = self.store.works()
        tasks = self.store.tasks()

        work_by_goal = {goal["id"]: [w for w in works if w.get("goal_id") == goal["id"]] for goal in goals}
        task_by_work = {work["id"]: [t for t in tasks if t["work_id"] == work["id"]] for work in works}

        hide = self.hide_completed_goal.get()

        for goal in goals:
            related_works = work_by_goal.get(goal["id"], [])
            goal_status = compute_goal_status(related_works)
            goal_done = len(related_works) > 0 and all(w["status"] == "DONE" for w in related_works)
            if hide and goal_done:
                continue

            goal_id = self.goal_tree.insert(
                "",
                "end",
                iid=goal["id"],
                text=goal["title"],
                values=(
                    "Goal",
                    STATUS_LABEL[goal_status],
                    goal.get("start_date", ""),
                    goal.get("end_date", ""),
                    "",
                    f"{compute_goal_progress(related_works)}%",
                ),
                open=False,
            )

            for work in related_works:
                if hide and work["status"] == "DONE":
                    continue
                work_node = self.goal_tree.insert(
                    goal_id,
                    "end",
                    iid=work["id"],
                    text=work["title"],
                    values=("Work", STATUS_LABEL[work["status"]], work.get("start_date", ""), work.get("end_date", ""), "", ""),
                    open=False,
                )
                for task in task_by_work.get(work["id"], []):
                    if hide and task["done"]:
                        continue
                    self.goal_tree.insert(
                        work_node,
                        "end",
                        iid=task["id"],
                        text=task["title"],
                        values=("Task", "완료" if task["done"] else "미완료", "", "", task.get("due_date", ""), ""),
                    )

        unassigned = [w for w in works if not w.get("goal_id")]
        if unassigned:
            detached = self.goal_tree.insert("", "end", iid="__ungrouped__", text="Goal 미연결 Work", values=("Group", "", "", "", "", ""), open=False)
            visible = 0
            for work in unassigned:
                if hide and work["status"] == "DONE":
                    continue
                visible += 1
                work_node = self.goal_tree.insert(
                    detached,
                    "end",
                    iid=work["id"],
                    text=work["title"],
                    values=("Work", STATUS_LABEL[work["status"]], work.get("start_date", ""), work.get("end_date", ""), "", ""),
                    open=False,
                )
                for task in task_by_work.get(work["id"], []):
                    if hide and task["done"]:
                        continue
                    self.goal_tree.insert(
                        work_node,
                        "end",
                        iid=task["id"],
                        text=task["title"],
                        values=("Task", "완료" if task["done"] else "미완료", "", "", task.get("due_date", ""), ""),
                    )
            if visible == 0:
                self.goal_tree.delete(detached)

    def refresh_calendar(self):
        for node in self.calendar_tree.get_children():
            self.calendar_tree.delete(node)

        today = date.today()
        month_start = (today.replace(day=1) + timedelta(days=32 * self.month_offset)).replace(day=1)
        year, month = month_start.year, month_start.month
        self.month_label.config(text=f"{year}년 {month}월")

        goals = self.store.goals()
        works = self.store.works()
        tasks = self.store.tasks()
        work_by_goal = {goal["id"]: [w for w in works if w.get("goal_id") == goal["id"]] for goal in goals}

        events = []

        def add_event(d, label, done):
            if not d:
                return
            try:
                parsed = datetime.strptime(d, "%Y-%m-%d").date()
            except ValueError:
                return
            if parsed.year == year and parsed.month == month:
                events.append((parsed, label, done))

        for goal in goals:
            goal_status = compute_goal_status(work_by_goal.get(goal["id"], []))
            add_event(goal.get("start_date", ""), f"[Goal] {goal['title']} 시작일", goal_status == "DONE")
            add_event(goal.get("end_date", ""), f"[Goal] {goal['title']} 완료일", goal_status == "DONE")

        for work in works:
            done = work["status"] == "DONE"
            add_event(work.get("start_date", ""), f"[Work] {work['title']} 시작일", done)
            add_event(work.get("end_date", ""), f"[Work] {work['title']} 완료일", done)

        for task in tasks:
            add_event(task.get("due_date", ""), f"[Task] {task['title']} 완료일", task["done"])

        events.sort(key=lambda x: x[0])
        for d, label, done in events:
            self.calendar_tree.insert("", "end", values=(d.isoformat(), label, "완료" if done else "미완료"), tags=("done" if done else "active",))

    def refresh_todo_tree(self):
        for node in self.todo_tree.get_children():
            self.todo_tree.delete(node)

        works = self.store.works()
        tasks = self.store.tasks()

        today = datetime.now().date()
        limit = today + timedelta(days=30)
        hide = self.hide_completed_todo.get()

        work_map = {w["id"]: w for w in works}
        grouped = {}
        for task in tasks:
            due = task.get("due_date", "")
            if not due:
                continue
            try:
                due_date = datetime.strptime(due, "%Y-%m-%d").date()
            except ValueError:
                continue
            if due_date < today or due_date > limit:
                continue
            if hide and task["done"]:
                continue
            grouped.setdefault(task["work_id"], []).append(task)

        for work_id, task_list in grouped.items():
            work = work_map.get(work_id)
            if not work:
                continue
            root = self.todo_tree.insert("", "end", iid=f"todo-{work_id}", text=work["title"], values=("", STATUS_LABEL[work["status"]]), open=True)
            task_list.sort(key=lambda t: t.get("due_date", ""))
            for task in task_list:
                self.todo_tree.insert(root, "end", iid=f"todo-task-{task['id']}", text=task["title"], values=(task.get("due_date", ""), "완료" if task["done"] else "미완료"))

        if not grouped:
            self.todo_tree.insert("", "end", text="한 달 이내에 완료해야 하는 Task가 없습니다.", values=("", ""))

    def refresh_all(self):
        self.update_folder_label()
        self.refresh_cycle_selector()
        self.refresh_form_options()
        self.refresh_goal_tree()
        self.refresh_calendar()
        self.refresh_todo_tree()

    def create_cycle(self):
        name = self.new_cycle_name.get().strip()
        if not name:
            messagebox.showwarning("입력 필요", "Cycle 이름을 입력하세요.")
            return
        parent_dir = self.cycle_parent_dir.get().strip()
        if not parent_dir:
            messagebox.showwarning("폴더 필요", "저장 상위 폴더를 먼저 선택하세요.")
            return
        if not os.path.isdir(parent_dir):
            messagebox.showwarning("폴더 오류", "유효한 폴더를 선택하세요.")
            return

        try:
            self.store.create_cycle(name, parent_dir)
        except Exception as exc:
            messagebox.showerror("생성 실패", f"Cycle 생성 중 오류가 발생했습니다.\n{exc}")
            return

        self.new_cycle_name.set("")
        self.refresh_all()

    def import_cycle(self):
        folder = filedialog.askdirectory(initialdir=self.cycle_parent_dir.get() or os.path.expanduser("~"), title="Cycle 데이터 폴더 선택")
        if not folder:
            return
        try:
            self.store.import_cycle(folder)
        except Exception as exc:
            messagebox.showerror("불러오기 실패", f"Cycle 불러오기에 실패했습니다.\n{exc}")
            return

        self.cycle_parent_dir.set(os.path.dirname(folder) or folder)
        self.refresh_all()
        messagebox.showinfo("불러오기 완료", "Cycle 데이터를 성공적으로 불러왔습니다.")

    def create_goal(self):
        if not self.store.selected_cycle_id():
            messagebox.showwarning("Cycle 필요", "먼저 Cycle을 생성하거나 불러오세요.")
            return
        title = self.goal_title.get().strip()
        if not title:
            messagebox.showwarning("입력 필요", "Goal 제목을 입력하세요.")
            return
        self.store.create_goal(title, self.goal_start.get().strip(), self.goal_end.get().strip())
        self.goal_title.set("")
        self.goal_start.set("")
        self.goal_end.set("")
        self.refresh_all()

    def create_work(self):
        if not self.store.selected_cycle_id():
            messagebox.showwarning("Cycle 필요", "먼저 Cycle을 생성하거나 불러오세요.")
            return
        title = self.work_title.get().strip()
        if not title:
            messagebox.showwarning("입력 필요", "Work 제목을 입력하세요.")
            return

        goal_value = self.work_goal.get().strip()
        goal_id = ""
        if goal_value and goal_value != "(미연결)" and "|" in goal_value:
            goal_id = goal_value.split("|")[-1]

        self.store.create_work(title, goal_id, self.work_start.get().strip(), self.work_end.get().strip())
        self.work_title.set("")
        self.work_start.set("")
        self.work_end.set("")
        self.refresh_all()

    def create_task(self):
        if not self.store.selected_cycle_id():
            messagebox.showwarning("Cycle 필요", "먼저 Cycle을 생성하거나 불러오세요.")
            return
        title = self.task_title.get().strip()
        if not title:
            messagebox.showwarning("입력 필요", "Task 제목을 입력하세요.")
            return

        work_value = self.task_work.get().strip()
        if not work_value or "|" not in work_value:
            messagebox.showwarning("Work 필요", "Task의 상위 Work를 선택하세요.")
            return

        work_id = work_value.split("|")[-1]
        self.store.create_task(title, work_id, self.task_due.get().strip())
        self.task_title.set("")
        self.task_due.set("")
        self.refresh_all()

    def change_selected_work_status(self):
        selected = self.goal_tree.selection()
        if not selected:
            messagebox.showwarning("선택 필요", "Work를 선택하세요.")
            return

        target = selected[0]
        work = next((w for w in self.store.works() if w["id"] == target), None)
        if not work:
            messagebox.showwarning("선택 오류", "선택된 항목이 Work가 아닙니다.")
            return

        self.store.update_work_status(work["id"], self.work_status_var.get())
        self.refresh_all()

    def toggle_selected_task(self):
        selected = self.goal_tree.selection() or self.todo_tree.selection()
        if not selected:
            messagebox.showwarning("선택 필요", "Task를 선택하세요.")
            return

        target = selected[0]
        task_id = target.replace("todo-task-", "", 1) if target.startswith("todo-task-") else target
        task = next((t for t in self.store.tasks() if t["id"] == task_id), None)
        if not task:
            messagebox.showwarning("선택 오류", "선택된 항목이 Task가 아닙니다.")
            return

        self.store.toggle_task(task["id"])
        self.refresh_all()

    def shift_month(self, direction):
        self.month_offset += direction
        self.refresh_calendar()


if __name__ == "__main__":
    app = App()
    app.mainloop()
