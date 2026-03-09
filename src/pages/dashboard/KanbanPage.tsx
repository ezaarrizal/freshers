import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  DragDropContext, Droppable, Draggable,
} from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";

interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  assigned_to: string | null;
  priority: "low" | "medium" | "high";
  created_at: string;
  assigned_profile?: { full_name: string } | { full_name: string }[];
}

interface ProjectMember {
  id: string;
  role: string;
  status: string;
  user_id: string;
  profiles: { full_name: string } | { full_name: string }[];
}

interface Project {
  id: string;
  title: string;
  creator_id: string;
  creator_name?: string;
  status: string;
  project_members: ProjectMember[];
}

const COLUMNS = [
  { id: "todo",        label: "📋 To Do",      color: "#64748b", bg: "rgba(100,116,139,0.1)"  },
  { id: "in_progress", label: "⚡ In Progress", color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  { id: "done",        label: "✅ Done",        color: "#4ade80", bg: "rgba(74,222,128,0.1)"  },
];

const PRIORITY_CONFIG = {
  low:    { label: "Low",    color: "#4ade80", bg: "rgba(74,222,128,0.12)"   },
  medium: { label: "Medium", color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
  high:   { label: "High",   color: "#f87171", bg: "rgba(248,113,113,0.12)" },
};

export default function KanbanPage() {
  const { id: projectId } = useParams();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);
  const [isMember, setIsMember] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", priority: "medium" as Task["priority"],
    assigned_to: "", status: "todo" as Task["status"],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (projectId) fetchAll();
  }, [projectId]);

  const fetchAll = async () => {
    const { data: proj, error: projError } = await supabase
      .from("projects")
      .select(`
        id, title, creator_id, status,
        profiles!projects_creator_id_fkey(full_name),
        project_members(id, role, status, user_id, profiles(full_name))
      `)
      .eq("id", projectId!)
      .single();

    console.log("Project:", proj, "Error:", projError);

    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .select("*, assigned_profile:profiles!tasks_assigned_to_fkey(full_name)")
      .eq("project_id", projectId!)
      .order("created_at", { ascending: true });

    console.log("Tasks:", taskData, "Error:", taskError);

    if (proj) {
      const creatorProfile = Array.isArray((proj as any).profiles)
        ? (proj as any).profiles[0]
        : (proj as any).profiles;

      setProject({
        ...proj,
        creator_name: creatorProfile?.full_name,
      } as Project);

      setIsCreator(proj.creator_id === user!.id);
      const memberCheck = proj.project_members?.some(
        (m: any) => m.user_id === user!.id && m.status === "active"
      );
      setIsMember(memberCheck || proj.creator_id === user!.id);
    }

    setTasks((taskData as Task[]) || []);
    setLoading(false);
  };

  // Semua member aktif + creator
  const getMembers = () => {
    if (!project) return [];

    const activeMembers = project.project_members.filter(m => m.status === "active");

    // Cek apakah creator sudah ada di member list
    const creatorAlreadyMember = activeMembers.some(m => m.user_id === project.creator_id);

    if (!creatorAlreadyMember) {
      return [
        ...activeMembers,
        {
          id: "creator",
          role: "Project Creator",
          status: "active",
          user_id: project.creator_id,
          profiles: { full_name: project.creator_name || "Creator" },
        } as ProjectMember,
      ];
    }

    return activeMembers;
  };

  const getMemberName = (userId: string): string => {
    const allMembers = getMembers();
    const m = allMembers.find(m => m.user_id === userId);
    if (!m) return "Unknown";
    return Array.isArray(m.profiles)
      ? (m.profiles[0] as any)?.full_name || "Unknown"
      : (m.profiles as any)?.full_name || "Unknown";
  };

  const openCreateModal = (status: Task["status"] = "todo") => {
    setEditTask(null);
    setForm({ title: "", description: "", priority: "medium", assigned_to: "", status });
    setShowModal(true);
  };

  const openEditModal = (task: Task) => {
    setEditTask(task);
    setForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      assigned_to: task.assigned_to || "",
      status: task.status,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);

    console.log("Saving task:", {
      project_id: projectId,
      title: form.title,
      status: form.status,
      created_by: user!.id
    });

    if (editTask) {
      const { data, error } = await supabase
        .from("tasks")
        .update({
          title: form.title,
          description: form.description,
          priority: form.priority,
          assigned_to: form.assigned_to || null,
          status: form.status,
        })
        .eq("id", editTask.id)
        .select("*, assigned_profile:profiles!tasks_assigned_to_fkey(full_name)")
        .single();

      console.log("Update result:", data, "Error:", error);
      if (data) setTasks(prev => prev.map(t => t.id === editTask.id ? data as Task : t));
    } else {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          project_id: projectId,
          title: form.title,
          description: form.description,
          priority: form.priority,
          assigned_to: form.assigned_to || null,
          status: form.status,
          created_by: user!.id,
        })
        .select("*, assigned_profile:profiles!tasks_assigned_to_fkey(full_name)")
        .single();

      console.log("Insert result:", data, "Error:", error);
      if (data) setTasks(prev => [...prev, data as Task]);
    }

    setSaving(false);
    setShowModal(false);
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm("Hapus task ini?")) return;
    await supabase.from("tasks").delete().eq("id", taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as Task["status"];
    setTasks(prev => prev.map(t =>
      t.id === draggableId ? { ...t, status: newStatus } : t
    ));
    await supabase.from("tasks").update({ status: newStatus }).eq("id", draggableId);
  };

  const getColumnTasks = (status: string) => tasks.filter(t => t.status === status);

  const completedCount = tasks.filter(t => t.status === "done").length;
  const totalCount = tasks.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{ color: "#6366f1", fontWeight: 600 }}>Memuat kanban...</div>
    </div>
  );

  if (!isMember) return (
    <div style={{ textAlign: "center", padding: "80px 24px" }}>
      <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🔒</div>
      <h3 style={{ color: "#e2e8f0" }}>Kamu bukan anggota project ini</h3>
      <Link to="/dashboard/projects" style={{ color: "#a78bfa" }}>← Kembali ke Browse</Link>
    </div>
  );

  const allMembers = getMembers();

  return (
    <div style={s.page}>
      <style>{css}</style>

      {/* HEADER */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <Link to={`/dashboard/projects/${projectId}`} style={s.backBtn}>
            ← Kembali ke Project
          </Link>
          <h1 style={s.title}>{project?.title}</h1>
          <div style={s.progressRow}>
            <div style={s.progressBarWrap}>
              <div style={{ ...s.progressFill, width: `${progressPct}%` }} />
            </div>
            <span style={s.progressLabel}>
              {progressPct}% selesai ({completedCount}/{totalCount} task)
            </span>
          </div>
        </div>
        <button onClick={() => openCreateModal()} style={s.addBtn} className="add-task-btn">
          ➕ Tambah Task
        </button>
      </div>

      {/* TEAM MEMBERS */}
      {allMembers.length > 0 && (
        <div style={s.membersBar}>
          <span style={s.membersLabel}>Tim:</span>
          <div style={s.avatarRow}>
            {allMembers.map(m => {
              const name = Array.isArray(m.profiles)
                ? (m.profiles[0] as any)?.full_name
                : (m.profiles as any)?.full_name;
              return (
                <div key={m.id} style={s.memberChip} title={`${name} — ${m.role}`}>
                  <div style={{
                    ...s.memberAvatar,
                    background: m.id === "creator"
                      ? "linear-gradient(135deg,#f59e0b,#f97316)"
                      : "linear-gradient(135deg,#6366f1,#a78bfa)",
                  }}>
                    {name?.[0]}
                  </div>
                  <span style={s.memberChipName}>{name?.split(" ")[0]}</span>
                  {m.id === "creator" && (
                    <span style={{ fontSize: "0.65rem", color: "#f59e0b" }}>👑</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KANBAN BOARD */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div style={s.board}>
          {COLUMNS.map(col => {
            const colTasks = getColumnTasks(col.id);
            return (
              <div key={col.id} style={s.column}>
                {/* Column Header */}
                <div style={s.colHeader}>
                  <div style={s.colTitleRow}>
                    <span style={{ ...s.colDot, background: col.color }} />
                    <span style={{ ...s.colTitle, color: col.color }}>{col.label}</span>
                    <span style={{ ...s.colCount, background: col.bg, color: col.color }}>
                      {colTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => openCreateModal(col.id as Task["status"])}
                    style={s.colAddBtn}
                    className="col-add-btn"
                    title="Tambah task">
                    +
                  </button>
                </div>

                {/* Droppable */}
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{
                        ...s.taskList,
                        background: snapshot.isDraggingOver ? col.bg : "transparent",
                        minHeight: "120px",
                        borderRadius: "12px",
                        transition: "background 0.2s",
                        padding: "4px",
                      }}>

                      {colTasks.length === 0 && !snapshot.isDraggingOver && (
                        <div style={s.emptyCol}>
                          <span style={{ fontSize: "1.5rem" }}>
                            {col.id === "todo" ? "📋" : col.id === "in_progress" ? "⚡" : "✅"}
                          </span>
                          <p style={{ color: "#475569", fontSize: "0.8rem", margin: "8px 0 0" }}>
                            Belum ada task
                          </p>
                        </div>
                      )}

                      {colTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                ...provided.draggableProps.style,
                                marginBottom: "10px",
                              }}>
                              <TaskCard
                                task={task}
                                isDragging={snapshot.isDragging}
                                getMemberName={getMemberName}
                                onEdit={() => openEditModal(task)}
                                onDelete={() => handleDelete(task.id)}
                                canEdit={isMember}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}

                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* MODAL */}
      {showModal && (
        <div style={s.modalOverlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>
                {editTask ? "✏️ Edit Task" : "➕ Tambah Task"}
              </h2>
              <button onClick={() => setShowModal(false)} style={s.closeBtn}>×</button>
            </div>

            <div style={s.modalBody}>
              <div style={s.field}>
                <label style={s.label}>Judul Task *</label>
                <input
                  style={s.input} className="modal-input"
                  placeholder="contoh: Setup database schema"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  autoFocus
                />
              </div>

              <div style={s.field}>
                <label style={s.label}>Deskripsi</label>
                <textarea
                  style={{ ...s.input, height: "80px", resize: "none" }}
                  className="modal-input"
                  placeholder="Detail task ini..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div style={s.field}>
                  <label style={s.label}>Prioritas</label>
                  <div style={s.priorityGrid}>
                    {(["low","medium","high"] as Task["priority"][]).map(p => (
                      <button key={p} onClick={() => setForm({ ...form, priority: p })}
                        style={{
                          ...s.priorityBtn,
                          background: form.priority === p ? PRIORITY_CONFIG[p].bg : "rgba(255,255,255,0.04)",
                          borderColor: form.priority === p ? PRIORITY_CONFIG[p].color : "rgba(255,255,255,0.08)",
                          color: form.priority === p ? PRIORITY_CONFIG[p].color : "#64748b",
                        }}>
                        {PRIORITY_CONFIG[p].label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={s.field}>
                  <label style={s.label}>Status</label>
                  <select
                    style={s.select} className="modal-input"
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value as Task["status"] })}>
                    <option value="todo">📋 To Do</option>
                    <option value="in_progress">⚡ In Progress</option>
                    <option value="done">✅ Done</option>
                  </select>
                </div>
              </div>

              {/* Assign — termasuk creator */}
              <div style={s.field}>
                <label style={s.label}>Assign ke</label>
                <select
                  style={s.select} className="modal-input"
                  value={form.assigned_to}
                  onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
                  <option value="">— Tidak diassign —</option>
                  {allMembers.map(m => {
                    const name = Array.isArray(m.profiles)
                      ? (m.profiles[0] as any)?.full_name
                      : (m.profiles as any)?.full_name;
                    return (
                      <option key={m.user_id} value={m.user_id}>
                        {name} ({m.role}{m.id === "creator" ? " 👑" : ""})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div style={s.modalFooter}>
              <button onClick={() => setShowModal(false)} style={s.cancelBtn}>Batal</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
                style={{ ...s.saveBtn, opacity: saving || !form.title.trim() ? 0.6 : 1 }}
                className="save-btn">
                {saving ? "Menyimpan..." : editTask ? "💾 Simpan" : "➕ Tambah"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TASK CARD ─────────────────────────────────────────
function TaskCard({ task, isDragging, getMemberName, onEdit, onDelete, canEdit }: {
  task: Task;
  isDragging: boolean;
  getMemberName: (id: string) => string;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
}) {
  const pc = PRIORITY_CONFIG[task.priority];
  return (
    <div style={{
      ...s.taskCard,
      boxShadow: isDragging ? "0 16px 40px rgba(0,0,0,0.4)" : "none",
      transform: isDragging ? "rotate(2deg)" : "none",
      borderColor: isDragging ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)",
    }} className="task-card">
      <div style={s.taskTop}>
        <span style={{ ...s.priorityTag, background: pc.bg, color: pc.color }}>
          {pc.label}
        </span>
        {canEdit && (
          <div style={s.taskActions} className="task-actions">
            <button onClick={onEdit} style={s.taskActionBtn} className="task-action-btn" title="Edit">✏️</button>
            <button onClick={onDelete} style={s.taskActionBtn} className="task-action-btn" title="Hapus">🗑️</button>
          </div>
        )}
      </div>

      <p style={s.taskTitle}>{task.title}</p>

      {task.description && (
        <p style={s.taskDesc}>{task.description}</p>
      )}

      {task.assigned_to && (
        <div style={s.assignee}>
          <div style={s.assigneeAvatar}>
            {getMemberName(task.assigned_to)?.[0] || "?"}
          </div>
          <span style={s.assigneeName}>
            {getMemberName(task.assigned_to)}
          </span>
        </div>
      )}
    </div>
  );
}

// ── STYLES ────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  .add-task-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(99,102,241,0.5) !important; }
  .col-add-btn:hover { background: rgba(99,102,241,0.2) !important; color: #a78bfa !important; }
  .task-card:hover .task-actions { opacity: 1 !important; }
  .task-action-btn:hover { background: rgba(255,255,255,0.1) !important; }
  .modal-input:focus { outline: none; border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
  .save-btn:hover:not(:disabled) { transform: translateY(-1px); }
  .save-btn:disabled { cursor: not-allowed; }
`;

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: "1300px", margin: "0 auto", fontFamily: "'Inter',sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", gap: "16px", flexWrap: "wrap" },
  headerLeft: { display: "flex", flexDirection: "column", gap: "8px" },
  backBtn: { color: "#64748b", textDecoration: "none", fontSize: "0.88rem", fontWeight: 500 },
  title: { fontSize: "1.6rem", fontWeight: 800, color: "#e2e8f0", margin: 0, letterSpacing: "-0.5px" },
  progressRow: { display: "flex", alignItems: "center", gap: "12px" },
  progressBarWrap: { width: "200px", height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "50px", overflow: "hidden" },
  progressFill: { height: "100%", background: "linear-gradient(90deg,#6366f1,#a78bfa)", borderRadius: "50px", transition: "width 0.5s ease" },
  progressLabel: { fontSize: "0.82rem", color: "#64748b", whiteSpace: "nowrap" },
  addBtn: { background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", border: "none", borderRadius: "50px", padding: "12px 24px", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", fontFamily: "'Inter',sans-serif", transition: "transform 0.2s, box-shadow 0.2s", boxShadow: "0 4px 20px rgba(99,102,241,0.4)", whiteSpace: "nowrap" },
  membersBar: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", padding: "12px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px" },
  membersLabel: { fontSize: "0.85rem", color: "#64748b", fontWeight: 600, whiteSpace: "nowrap" },
  avatarRow: { display: "flex", gap: "8px", flexWrap: "wrap" },
  memberChip: { display: "flex", alignItems: "center", gap: "6px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "50px", padding: "4px 12px 4px 4px" },
  memberAvatar: { width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, color: "white" },
  memberChipName: { fontSize: "0.8rem", color: "#a78bfa", fontWeight: 600 },
  board: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px", alignItems: "start" },
  column: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "16px", minHeight: "500px" },
  colHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  colTitleRow: { display: "flex", alignItems: "center", gap: "8px" },
  colDot: { width: "8px", height: "8px", borderRadius: "50%" },
  colTitle: { fontWeight: 700, fontSize: "0.9rem" },
  colCount: { fontSize: "0.75rem", fontWeight: 700, padding: "2px 8px", borderRadius: "50px" },
  colAddBtn: { width: "28px", height: "28px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#64748b", cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',sans-serif", transition: "all 0.2s" },
  taskList: { display: "flex", flexDirection: "column" },
  emptyCol: { display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 16px", opacity: 0.5 },
  taskCard: { background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "14px", cursor: "grab", transition: "border-color 0.2s", userSelect: "none" },
  taskTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" },
  priorityTag: { fontSize: "0.7rem", fontWeight: 700, padding: "3px 10px", borderRadius: "50px" },
  taskActions: { display: "flex", gap: "4px", opacity: 0, transition: "opacity 0.2s" },
  taskActionBtn: { background: "transparent", border: "none", cursor: "pointer", fontSize: "0.85rem", padding: "4px 6px", borderRadius: "6px", transition: "background 0.2s" },
  taskTitle: { fontSize: "0.9rem", fontWeight: 600, color: "#e2e8f0", margin: "0 0 6px", lineHeight: 1.4 },
  taskDesc: { fontSize: "0.8rem", color: "#64748b", margin: "0 0 10px", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },
  assignee: { display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.05)" },
  assigneeAvatar: { width: "20px", height: "20px", borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 700, color: "white" },
  assigneeName: { fontSize: "0.78rem", color: "#94a3b8", fontWeight: 500 },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "24px" },
  modal: { background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", width: "100%", maxWidth: "520px", overflow: "hidden" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 28px", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  modalTitle: { fontSize: "1.1rem", fontWeight: 700, color: "#e2e8f0", margin: 0 },
  closeBtn: { background: "rgba(255,255,255,0.06)", border: "none", color: "#94a3b8", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer", fontSize: "1.2rem", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',sans-serif" },
  modalBody: { padding: "24px 28px", display: "flex", flexDirection: "column", gap: "16px" },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: "10px", padding: "20px 28px", borderTop: "1px solid rgba(255,255,255,0.06)" },
  field: { display: "flex", flexDirection: "column", gap: "8px" },
  label: { fontSize: "0.88rem", fontWeight: 600, color: "#e2e8f0" },
  input: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "12px 14px", fontSize: "0.9rem", color: "#e2e8f0", fontFamily: "'Inter',sans-serif", transition: "border-color 0.2s" },
  select: { background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "12px 14px", fontSize: "0.9rem", color: "#e2e8f0", fontFamily: "'Inter',sans-serif", cursor: "pointer" },
  priorityGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px" },
  priorityBtn: { border: "1px solid", borderRadius: "8px", padding: "8px", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s", fontFamily: "'Inter',sans-serif" },
  cancelBtn: { background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "none", borderRadius: "50px", padding: "10px 24px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" },
  saveBtn: { background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", border: "none", borderRadius: "50px", padding: "10px 28px", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif", transition: "transform 0.2s", boxShadow: "0 4px 16px rgba(99,102,241,0.4)" },
};
