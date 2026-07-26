import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Task = {
  id: number;
  title: string;
  vehicle: string;
  customer: string;
  area: string;
  responsible: string;
  description: string;
  priority: string;
  status?: string;
};

type TaskForm = {
  title: string;
  description: string;
  priority: string;
  status: string;
};

type User = {
  name: string;
  email: string;
  picture?: string;
};

const API_URL = "http://localhost:4000";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const isClientIdPlaceholder =
  !GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes("your-google-client-id");

const initialForm: TaskForm = {
  title: "",
  description: "",
  priority: "Orta",
  status: "Yapılacak",
};

const priorityOrder: Record<string, number> = {
  Acil: 0,
  Yüksek: 1,
  Orta: 2,
  Düşük: 3,
};

const priorityClassNames: Record<string, string> = {
  Acil: "badge-acil",
  Yüksek: "badge-yuksek",
  Orta: "badge-orta",
  Düşük: "badge-dusuk",
};

const statusClassNames: Record<string, string> = {
  Yapılacak: "badge-status-blue",
  Tamamlandı: "badge-status-green",
};

const tableColumns = [
  { field: "index", label: "No", minWidth: 60 },
  { field: "status", label: "Durum", minWidth: 120 },
  { field: "title", label: "Görev", minWidth: 180 },
  { field: "priority", label: "Önem", minWidth: 100 },
  { field: "description", label: "Açıklama", minWidth: 320 },
];

function parseJwt(token: string) {
  try {
    const base64 = token.split(".")[1];
    const payload = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(payload)));
  } catch {
    return null;
  }
}

function normalizeQuery(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function matchesSearch(task: Task, searchText: string) {
  const normalizedQuery = normalizeQuery(searchText);
  if (!normalizedQuery) return true;

  const searchable = [task.title, task.description].join(" ").toLowerCase();

  return normalizedQuery.split(" ").every((token) => {
    if (!token) return true;
    if (!token.includes(":")) {
      return searchable.includes(token);
    }

    const [field, rawValue] = token.split(":");
    const value = rawValue.trim();
    if (!value) return searchable.includes(token);

    switch (field) {
      case "title":
      case "başlık":
        return task.title.toLowerCase().includes(value);
      case "description":
      case "açıklama":
        return task.description.toLowerCase().includes(value);
      default:
        return searchable.includes(token);
    }
  });
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("taskflow_user");
    if (!stored) return null;
    try {
      return JSON.parse(stored) as User;
    } catch {
      return null;
    }
  });

  const [idToken, setIdToken] = useState<string | null>(() => {
    return localStorage.getItem("taskflow_id_token");
  });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [form, setForm] = useState<TaskForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [editingCell, setEditingCell] = useState<{
    id: number;
    field: string;
  } | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const startEditingCell = useCallback((task: Task, field: string) => {
    if (field === "index") return;
    setEditingCell({ id: task.id, field });
    const fallback = field === "status" ? "Yapılacak" : "";
    setEditingValue(String(task[field as keyof Task] ?? fallback));
  }, []);

  const cancelCellEdit = useCallback(() => {
    setEditingCell(null);
    setEditingValue("");
  }, []);

  const saveCellEdit = useCallback(async () => {
    if (!editingCell) return;
    if (!idToken) {
      setError(
        "Oturumunuzun süresi dolmuş olabilir. Lütfen tekrar giriş yapın.",
      );
      return;
    }

    const task = tasks.find((item) => item.id === editingCell.id);
    if (!task) {
      cancelCellEdit();
      return;
    }

    const value = editingValue.trim();
    const field = editingCell.field;
    if (String(task[field as keyof Task] ?? "") === value) {
      cancelCellEdit();
      return;
    }

    const allowedStatuses = ["Yapılacak", "Tamamlandı"];
    const allowedPriorities = ["Acil", "Yüksek", "Orta", "Düşük"];
    const data: Record<string, string> = {};

    if (field === "status") {
      if (!allowedStatuses.includes(value)) {
        setError("Geçersiz durum değeri.");
        return;
      }
      data.status = value;
    } else if (field === "priority") {
      if (!allowedPriorities.includes(value)) {
        setError("Geçersiz önem değeri.");
        return;
      }
      data.priority = value;
    } else {
      data[field] = value;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/tasks/${editingCell.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || response.statusText);
      }

      const updatedTask = (await response.json()) as Task;
      setTasks((prev) =>
        prev.map((item) => (item.id === updatedTask.id ? updatedTask : item)),
      );
      cancelCellEdit();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Güncelleme başarısız oldu.",
      );
    } finally {
      setLoading(false);
    }
  }, [cancelCellEdit, editingCell, editingValue, idToken, tasks]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    index: 60,
    title: 220,
    status: 120,
    priority: 110,
    description: 360,
  });
  const resizeState = useRef<{
    field: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const handleColumnMouseMove = useCallback((event: MouseEvent) => {
    const current = resizeState.current;
    if (!current) return;

    const delta = event.clientX - current.startX;
    setColumnWidths((prev) => ({
      ...prev,
      [current.field]: Math.max(80, current.startWidth + delta),
    }));
  }, []);

  const handleColumnMouseUp = useCallback(() => {
    if (!resizeState.current) return;
    resizeState.current = null;
    window.removeEventListener("mousemove", handleColumnMouseMove);
    window.removeEventListener("mouseup", handleColumnMouseUp);
  }, [handleColumnMouseMove]);

  const startColumnResize = useCallback(
    (field: string, event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      resizeState.current = {
        field,
        startX: event.clientX,
        startWidth: columnWidths[field] ?? 120,
      };
      window.addEventListener("mousemove", handleColumnMouseMove);
      window.addEventListener("mouseup", handleColumnMouseUp);
    },
    [columnWidths, handleColumnMouseMove, handleColumnMouseUp],
  );

  const filteredTasks = useMemo(
    () => tasks.filter((task) => matchesSearch(task, query)),
    [query, tasks],
  );

  const sortedTasks = useMemo(
    () =>
      [...filteredTasks].sort((a, b) => {
        return (
          (priorityOrder[a.priority] ?? 999) -
          (priorityOrder[b.priority] ?? 999)
        );
      }),
    [filteredTasks],
  );

  useEffect(() => {
    async function loadTasks() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/tasks`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
        if (!response.ok) throw new Error("Görevler yüklenemedi.");
        const data = (await response.json()) as Task[];
        setTasks(
          data.map((task) => ({
            ...task,
            status: task.status ?? "Yapılacak",
          })),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bilinmeyen hata");
      } finally {
        setLoading(false);
      }
    }

    if (user && idToken) {
      loadTasks();
    }
  }, [idToken, user]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!profileMenuRef.current) return;
      if (!(event.target instanceof Node)) return;
      if (!profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const googleInitialized = useRef(false);

  useEffect(() => {
    if (user !== null) return;

    if (!GOOGLE_CLIENT_ID) {
      setGoogleError(
        "Lütfen frontend/.env dosyasına VITE_GOOGLE_CLIENT_ID ekleyin.",
      );
      return;
    }

    if (isClientIdPlaceholder) {
      setGoogleError(
        "Frontend/.env dosyanızda geçerli bir Google Client ID yok. Lütfen Google Cloud Console'dan aldığınız gerçek client ID'yi ekleyin.",
      );
      return;
    }

    let attempts = 0;
    const initializeGoogle = () => {
      const google = (window as any).google;
      if (!google?.accounts?.id) {
        attempts += 1;
        if (attempts < 15) {
          window.setTimeout(initializeGoogle, 150);
        } else {
          setGoogleError("Google kimlik doğrulama scripti yüklenemedi.");
        }
        return;
      }

      if (!googleInitialized.current) {
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          ux_mode: "popup",
        });
        googleInitialized.current = true;
      }

      const button = document.getElementById("google-signin-button");
      if (button) {
        google.accounts.id.renderButton(button, {
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "rectangular",
        });
      }
    };

    initializeGoogle();
  }, [user]);

  const handleCredentialResponse = useCallback((response: any) => {
    if (!response?.credential) {
      setGoogleError("Google kimlik doğrulama başarısız oldu.");
      return;
    }

    const profile = parseJwt(response.credential);
    if (!profile?.email) {
      setGoogleError("Google hesabından kullanıcı bilgisi alınamadı.");
      return;
    }

    const nextUser: User = {
      name: profile.name || profile.email,
      email: profile.email,
      picture: profile.picture,
    };

    setUser(nextUser);
    setIdToken(response.credential);
    localStorage.setItem("taskflow_user", JSON.stringify(nextUser));
    localStorage.setItem("taskflow_id_token", response.credential);
  }, []);

  const handleSignOut = useCallback(() => {
    setUser(null);
    setIdToken(null);
    setShowForm(false);
    setQuery("");
    setTasks([]);
    setProfileMenuOpen(false);
    localStorage.removeItem("taskflow_user");
    localStorage.removeItem("taskflow_id_token");
  }, []);

  const handleChange = useCallback(
    (field: keyof TaskForm) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm((current) => ({ ...current, [field]: event.target.value }));
      },
    [],
  );

  const isFormValid = useMemo(() => {
    return form.title.trim().length > 0;
  }, [form.title]);

  const handleSubmit = useCallback(async () => {
    if (!isFormValid) {
      setError("Lütfen tüm zorunlu alanları doldurun.");
      return;
    }

    if (!idToken) {
      setError(
        "Oturumunuzun süresi dolmuş olabilir. Lütfen tekrar giriş yapın.",
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(form),
      });

      const text = await response.text();
      let responseBody: any = null;
      try {
        responseBody = JSON.parse(text);
      } catch {
        responseBody = null;
      }

      if (!response.ok) {
        const message =
          responseBody?.error ||
          responseBody?.message ||
          text ||
          `Hata ${response.status}: ${response.statusText}`;

        if (response.status === 401) {
          setError(
            "Oturumunuzun süresi dolmuş olabilir. Lütfen tekrar giriş yapın.",
          );
          handleSignOut();
          return;
        }

        console.error(
          "Task save failed",
          response.status,
          message,
          responseBody,
        );
        throw new Error(message);
      }

      const newTask = responseBody as Task;
      setTasks((prev) => [newTask, ...prev]);
      setForm(initialForm);
      setQuery("");
      setShowForm(false);
    } catch (err) {
      console.error("Görev kaydetme hatası", err);
      setError(err instanceof Error ? err.message : "Bilinmeyen hata");
    } finally {
      setLoading(false);
    }
  }, [form, handleSignOut, idToken, isFormValid]);

  const summary = useMemo(
    () => ({
      total: tasks.length,
      urgent: tasks.filter((task) => task.priority === "Acil").length,
      active: tasks.filter((task) => task.priority !== "Düşük").length,
    }),
    [tasks],
  );

  const summaryCards = [
    {
      label: "Toplam görev",
      value: summary.total,
      detail: "Tüm görevleriniz.",
    },
    {
      label: "Acil görevler",
      value: summary.urgent,
      detail: "Hemen işlem gereken görevler.",
    },
    {
      label: "Filtre aktif",
      value: query ? "Evet" : "Hayır",
      detail: "Arama filtresi durumunuz.",
    },
  ];

  if (!user) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <span className="eyebrow">Görev Yönetimi</span>
            <h1>Hızlı ve güvenli giriş</h1>
          </div>
          <p>
            Google hesabınızla giriş yaparak görevlerinizi görüntüleyin, yeni
            kayıtlar ekleyin ve kiralama sürecinizi dijital olarak yönetin.
          </p>
          <div id="google-signin-button" className="google-button" />
          {googleError && <div className="toast-error">{googleError}</div>}
          <div className="login-help">
            <p>
              Eğer giriş butonu görünmüyorsa <code>frontend/.env</code>{" "}
              dosyanıza
              <code>VITE_GOOGLE_CLIENT_ID</code> ekleyin.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <div className="topbar">
        <div className="topbar-title">
          <span className="eyebrow">Görev yönetimi</span>
          <h1>Görevler</h1>
        </div>
        <div className="user-bar" ref={profileMenuRef}>
          <button
            type="button"
            className="user-chip user-chip-button"
            onClick={() => setProfileMenuOpen((current) => !current)}
          >
            {user.picture ? <img src={user.picture} alt={user.name} /> : null}
            <div>
              <span>{user.name}</span>
              <small>{user.email}</small>
            </div>
          </button>

          <div className={`profile-dropdown ${profileMenuOpen ? "open" : ""}`}>
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                setProfileMenuOpen(false);
                handleSignOut();
              }}
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      </div>

      <div className="app-shell">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <strong>Workiom</strong>
            <span>Görevler</span>
          </div>
          <nav className="sidebar-nav">
            <button className="sidebar-item active">Anasayfa</button>
            <button className="sidebar-item">Gelen Kutusu</button>
            <button className="sidebar-item">Görevlerim</button>
            <button className="sidebar-item">Kontrol Panelleri</button>
            <button className="sidebar-item">Projeler</button>
            <button className="sidebar-item">Araçlar</button>
            <button className="sidebar-item">Bakım Kayıtları</button>
            <button className="sidebar-item">Sürücüler</button>
            <button className="sidebar-item">Seferler / Teslimatlar</button>
            <button className="sidebar-item">Müşteriler / İş Ortakları</button>
            <button className="sidebar-item">Talep ve Bildirimler</button>
            <button className="sidebar-item">Vize</button>
          </nav>
          <div className="sidebar-footer">
            <button className="sidebar-link">+ Yeni Liste Ekle</button>
            <div className="sidebar-links">
              <button className="sidebar-link">Şablonlar</button>
              <button className="sidebar-link">Yardım</button>
              <button className="sidebar-link">Ayarlar</button>
              <button className="sidebar-link">İletişim</button>
            </div>
          </div>
        </aside>

        <main className="workspace">
          <section className="workspace-actions">
            <div className="action-row">
              <div className="action-buttons">
                <button
                  className="btn-primary"
                  onClick={() => setShowForm((current) => !current)}
                >
                  {showForm ? "Formu Gizle" : "Yeni Görev Ekle"}
                </button>
                <button className="btn-secondary">Filtrele</button>
              </div>
            </div>
          </section>

          <section className="tasks-panel compact">
            <div className="panel-header compact">
              <div>
                <h2>Görev Listesi</h2>
                <p>Arama yaparak görevlerinizi hızlıca bulun.</p>
              </div>
              <div className="panel-actions">
                <input
                  className="search"
                  placeholder="Bul (başlık, açıklama...)"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </div>

            {error && <div className="toast-error">{error}</div>}

            <div className="tasks-table-wrapper">
              <table className="tasks-table">
                <thead>
                  <tr>
                    {tableColumns.map((column) => (
                      <th
                        key={column.field}
                        style={{ width: columnWidths[column.field] }}
                      >
                        <div className="header-cell">
                          <span>{column.label}</span>
                          <div
                            className="resize-handle"
                            onMouseDown={(event) =>
                              startColumnResize(column.field, event)
                            }
                            aria-label={`Resize ${column.label} column`}
                          />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {showForm && (
                    <>
                      <tr className="form-row">
                        {tableColumns.map((column) => (
                          <td
                            key={column.field}
                            style={{ width: columnWidths[column.field] }}
                          >
                            {column.field === "index" ? null : column.field ===
                              "priority" ? (
                              <select
                                value={form.priority}
                                onChange={handleChange("priority")}
                              >
                                <option value="Acil">Acil</option>
                                <option value="Yüksek">Yüksek</option>
                                <option value="Orta">Orta</option>
                                <option value="Düşük">Düşük</option>
                              </select>
                            ) : column.field === "status" ? (
                              <select
                                value={form.status}
                                onChange={handleChange("status")}
                              >
                                <option value="Yapılacak">Yapılacak</option>
                                <option value="Tamamlandı">Tamamlandı</option>
                              </select>
                            ) : (
                              <input
                                type="text"
                                placeholder={
                                  column.field === "title"
                                    ? "Görev başlığı"
                                    : "Açıklama"
                                }
                                value={form[column.field as keyof TaskForm]}
                                onChange={handleChange(
                                  column.field as keyof TaskForm,
                                )}
                              />
                            )}
                          </td>
                        ))}
                      </tr>
                      <tr className="form-actions-row">
                        <td colSpan={tableColumns.length}>
                          <div className="form-actions">
                            <button
                              type="button"
                              className="btn-primary"
                              onClick={handleSubmit}
                              disabled={loading || !isFormValid}
                            >
                              Kaydet
                            </button>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => setShowForm(false)}
                            >
                              İptal
                            </button>
                          </div>
                        </td>
                      </tr>
                    </>
                  )}

                  {loading && tasks.length === 0 ? (
                    <tr>
                      <td colSpan={tableColumns.length} className="no-data">
                        Görevler yükleniyor...
                      </td>
                    </tr>
                  ) : sortedTasks.length === 0 ? (
                    <tr>
                      <td colSpan={tableColumns.length} className="no-data">
                        Hiç görev bulunamadı. Yeni görev ekleyin.
                      </td>
                    </tr>
                  ) : (
                    sortedTasks.map((task, index) => (
                      <tr key={task.id} className="task-row">
                        {tableColumns.map((column) => {
                          const isEditing =
                            editingCell?.id === task.id &&
                            editingCell.field === column.field;

                          return (
                            <td
                              key={column.field}
                              style={{ width: columnWidths[column.field] }}
                              onDoubleClick={() =>
                                startEditingCell(task, column.field)
                              }
                            >
                              {column.field === "index" ? (
                                index + 1
                              ) : isEditing ? (
                                column.field === "status" ? (
                                  <select
                                    autoFocus
                                    value={editingValue}
                                    onChange={(event) =>
                                      setEditingValue(event.target.value)
                                    }
                                    onBlur={saveCellEdit}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") {
                                        saveCellEdit();
                                      }
                                      if (event.key === "Escape") {
                                        cancelCellEdit();
                                      }
                                    }}
                                  >
                                    <option value="Yapılacak">Yapılacak</option>
                                    <option value="Tamamlandı">
                                      Tamamlandı
                                    </option>
                                  </select>
                                ) : column.field === "priority" ? (
                                  <select
                                    autoFocus
                                    value={editingValue}
                                    onChange={(event) =>
                                      setEditingValue(event.target.value)
                                    }
                                    onBlur={saveCellEdit}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") {
                                        saveCellEdit();
                                      }
                                      if (event.key === "Escape") {
                                        cancelCellEdit();
                                      }
                                    }}
                                  >
                                    <option value="Acil">Acil</option>
                                    <option value="Yüksek">Yüksek</option>
                                    <option value="Orta">Orta</option>
                                    <option value="Düşük">Düşük</option>
                                  </select>
                                ) : (
                                  <input
                                    autoFocus
                                    type="text"
                                    value={editingValue}
                                    onChange={(event) =>
                                      setEditingValue(event.target.value)
                                    }
                                    onBlur={saveCellEdit}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") {
                                        saveCellEdit();
                                      }
                                      if (event.key === "Escape") {
                                        cancelCellEdit();
                                      }
                                    }}
                                  />
                                )
                              ) : column.field === "status" ? (
                                <span
                                  className={`priority ${
                                    statusClassNames[
                                      task.status ?? "Yapılacak"
                                    ] ?? ""
                                  }`}
                                >
                                  {task.status ?? "Yapılacak"}
                                </span>
                              ) : column.field === "priority" ? (
                                <span
                                  className={`priority ${
                                    priorityClassNames[task.priority] ?? ""
                                  }`}
                                >
                                  {task.priority}
                                </span>
                              ) : (
                                task[column.field as keyof Task] || "-"
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
