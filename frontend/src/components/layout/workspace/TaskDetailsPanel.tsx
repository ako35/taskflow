import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Task, TaskComment, User } from "../../../types";
import { UiGlyph } from "../../ui/Icons";
import { API_URL, priorityClassNames, statusClassNames } from "../../../constants";
import InlineSelectMenu from "../../tasks/InlineSelectMenu";
import ConfirmDialog from "../../ui/ConfirmDialog";

type TaskDetailsPanelProps = {
  open: boolean;
  task: Task | null;
  currentUser: User | null;
  isWorkspaceOwner: boolean;
  comments: TaskComment[];
  commentsLoading: boolean;
  commentDraft: string;
  commentSubmitting: boolean;
  taskUpdating: boolean;
  idToken: string | null;
  onClose: () => void;
  onUnauthorized: () => void;
  onCommentDraftChange: (value: string) => void;
  onSubmitComment: () => void;
  onDeleteComment: (commentId: number) => void;
  onSaveTaskDetails: (payload: {
    title: string;
    status: string;
    priority: string;
    remindAt: string | null;
  }) => Promise<void>;
  onDeleteTask: (taskId: number) => void;
};

function toDateTimeLocal(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function authorDisplayName(comment: TaskComment) {
  const fullName = [comment.author.firstName, comment.author.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || comment.author.email;
}

function formatCommentDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatTaskCreatedAt(value?: string) {
  if (!value) {
    return "Oluşturma tarihi bilinmiyor";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Oluşturma tarihi bilinmiyor";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function TaskDetailsPanel({
  open,
  task,
  currentUser,
  isWorkspaceOwner,
  comments,
  commentsLoading,
  commentDraft,
  commentSubmitting,
  taskUpdating,
  idToken,
  onClose,
  onUnauthorized,
  onCommentDraftChange,
  onSubmitComment,
  onDeleteComment,
  onSaveTaskDetails,
  onDeleteTask,
}: TaskDetailsPanelProps) {
  const [draftTitle, setDraftTitle] = useState("");
  const [draftStatus, setDraftStatus] = useState("Yapılacak");
  const [draftPriority, setDraftPriority] = useState("Orta");
  const [draftRemindAt, setDraftRemindAt] = useState("");
  const [editingField, setEditingField] = useState<
    "status" | "priority" | null
  >(null);
  const [saveAcknowledged, setSaveAcknowledged] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [aiImproving, setAiImproving] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const saveAckTimerRef = useRef<number | null>(null);
  const titleTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!task) {
      return;
    }

    setDraftTitle(task.title || "");
    setDraftStatus(task.status ?? "Yapılacak");
    setDraftPriority(task.priority || "Orta");
    setDraftRemindAt(toDateTimeLocal(task.remindAt));
    setSaveAcknowledged(false);
    setDeleteConfirmOpen(false);
    setAiError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-sync drafts when switching tasks; a save updates `task`'s reference too and must not cut off the "Kaydedildi" acknowledgment below
  }, [task?.id]);

  useEffect(() => {
    return () => {
      if (saveAckTimerRef.current !== null) {
        window.clearTimeout(saveAckTimerRef.current);
      }
    };
  }, []);

  useLayoutEffect(() => {
    const textarea = titleTextareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 180 ? "auto" : "hidden";
  }, [draftTitle, open, task?.id]);

  const canSaveTaskDetails = useMemo(() => {
    if (!task) {
      return false;
    }

    const nextTitle = draftTitle.trim();
    const baseTitle = task.title.trim();
    const baseStatus = task.status ?? "Yapılacak";
    const basePriority = task.priority || "Orta";
    const baseRemindAt = toDateTimeLocal(task.remindAt);

    const hasChanges =
      nextTitle !== baseTitle ||
      draftStatus !== baseStatus ||
      draftPriority !== basePriority ||
      draftRemindAt !== baseRemindAt;

    return Boolean(nextTitle) && hasChanges && !taskUpdating;
  }, [
    draftPriority,
    draftRemindAt,
    draftStatus,
    draftTitle,
    task,
    taskUpdating,
  ]);

  if (!open || !task) {
    return null;
  }

  const handleDelete = () => {
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    setDeleteConfirmOpen(false);
    onDeleteTask(task.id);
    onClose();
  };

  const saveButtonLabel = taskUpdating
    ? "Kaydediliyor..."
    : saveAcknowledged && !canSaveTaskDetails
      ? "✓ Kaydedildi"
      : "Degisiklikleri Kaydet";

  const handleAiImprove = async () => {
    if (!idToken) {
      setAiError("Oturumunuzun süresi dolmuş olabilir. Lütfen tekrar giriş yapın.");
      return;
    }

    const sourceText = draftTitle.trim();
    if (!sourceText) {
      setAiError("AI iyilestirme icin once metin olusturun.");
      return;
    }

    setAiImproving(true);
    setAiError(null);

    try {
      const refineResponse = await fetch(`${API_URL}/ai/refine-text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          field: "title",
          text: sourceText,
        }),
      });

      const refinePayload = (await refineResponse
        .json()
        .catch(() => null)) as { text?: string; error?: string } | null;

      if (refineResponse.status === 401) {
        onUnauthorized();
        return;
      }

      if (!refineResponse.ok || !refinePayload?.text) {
        throw new Error(
          refinePayload?.error || "AI metin iyilestirme basarisiz oldu.",
        );
      }

      const refinedText = refinePayload.text.trim();
      if (!refinedText) {
        throw new Error("AI duzenleme sonucu bos dondu.");
      }

      setDraftTitle(refinedText);
    } catch (error) {
      setAiError(
        error instanceof Error
          ? error.message
          : "AI metin iyilestirme sirasinda bir hata olustu.",
      );
    } finally {
      setAiImproving(false);
    }
  };

  const handleSaveDetails = async () => {
    await onSaveTaskDetails({
      title: draftTitle.trim(),
      status: draftStatus,
      priority: draftPriority,
      remindAt: draftRemindAt ? new Date(draftRemindAt).toISOString() : null,
    });

    setSaveAcknowledged(true);
    if (saveAckTimerRef.current !== null) {
      window.clearTimeout(saveAckTimerRef.current);
    }

    saveAckTimerRef.current = window.setTimeout(() => {
      setSaveAcknowledged(false);
      saveAckTimerRef.current = null;
    }, 1500);
  };

  return (
    <aside className="task-details-panel" aria-label="Görev detay paneli">
      <div className="task-details-head">
        <h3>Görev Detayı</h3>
        <div className="task-details-head-actions">
          <button
            type="button"
            className="task-details-close"
            onClick={onClose}
            aria-label="Detay panelini kapat"
          >
            <UiGlyph icon="close" />
          </button>
        </div>
      </div>

      <div className="task-details-body">
        <div className="task-details-card task-details-edit-section">
          <h4>Görevi Düzenle</h4>

          <label className="task-details-field">
            <span className="task-details-field-label-row">
              Görev Metni
              <button
                type="button"
                className="task-action-btn task-action-ai-btn task-details-ai-btn"
                onClick={(event) => {
                  event.preventDefault();
                  void handleAiImprove();
                }}
                disabled={aiImproving}
                aria-label="AI ile metni iyilestir"
                title="AI ile metni iyilestir"
              >
                <span aria-hidden="true">
                  <UiGlyph icon="spark" />
                </span>
                {aiImproving ? "AI iyilestiriyor..." : "AI ile iyilestir"}
              </button>
            </span>
            <textarea
              ref={titleTextareaRef}
              className="task-details-title-input"
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              placeholder="Görev adını yazın"
              aria-label="Görev metni"
              rows={2}
            />
            {aiError ? <p className="task-details-ai-error">{aiError}</p> : null}
          </label>

          <p className="task-details-created-at">
            Oluşturma Tarihi: {formatTaskCreatedAt(task.createdAt)}
          </p>

          <label className="task-details-field">
            <span>Hatırlatıcı</span>
            <div className="task-reminder-controls">
              <input
                type="datetime-local"
                value={draftRemindAt}
                onChange={(event) => setDraftRemindAt(event.target.value)}
                aria-label="Hatırlatıcı tarihi ve saati"
              />
              {draftRemindAt ? (
                <button
                  type="button"
                  className="btn-secondary task-reminder-clear"
                  onClick={() => setDraftRemindAt("")}
                >
                  Kaldır
                </button>
              ) : null}
            </div>
          </label>

          <div className="task-details-field">
            <span>Durum</span>
            {editingField === "status" ? (
              <InlineSelectMenu
                value={draftStatus}
                fallbackValue="Yapılacak"
                options={["Yapılacak", "Tamamlandı"]}
                getOptionClassName={(opt) => statusClassNames[opt] ?? ""}
                badgeClassName="task-status-badge"
                horizontalAlign="left"
                onSelect={(opt) => {
                  setDraftStatus(opt);
                  setEditingField(null);
                }}
                onCancel={() => setEditingField(null)}
              />
            ) : (
              <button
                type="button"
                className={`inline-option-chip task-badge task-status-badge ${statusClassNames[draftStatus] ?? ""} active`}
                onClick={() => setEditingField("status")}
              >
                {draftStatus}
              </button>
            )}
          </div>

          <div className="task-details-field">
            <span>Önem</span>
            {editingField === "priority" ? (
              <InlineSelectMenu
                value={draftPriority}
                fallbackValue="Orta"
                options={["Acil", "Yüksek", "Orta", "Düşük"]}
                getOptionClassName={(opt) => priorityClassNames[opt] ?? ""}
                badgeClassName="task-priority-badge"
                horizontalAlign="left"
                onSelect={(opt) => {
                  setDraftPriority(opt);
                  setEditingField(null);
                }}
                onCancel={() => setEditingField(null)}
              />
            ) : (
              <button
                type="button"
                className={`inline-option-chip task-badge task-priority-badge ${priorityClassNames[draftPriority] ?? ""} active`}
                onClick={() => setEditingField("priority")}
              >
                {draftPriority}
              </button>
            )}
          </div>

          <div className="task-details-actions-row">
            <button
              type="button"
              className="btn-secondary task-details-delete-inline"
              onClick={handleDelete}
            >
              <UiGlyph icon="trash" />
              Görevi Sil
            </button>
            <button
              type="button"
              className={`btn-primary task-details-save-btn ${
                saveAcknowledged && !taskUpdating && !canSaveTaskDetails
                  ? "saved"
                  : ""
              }`}
              onClick={() => {
                void handleSaveDetails();
              }}
              disabled={!canSaveTaskDetails}
            >
              {saveButtonLabel}
            </button>
          </div>
        </div>

        <div className="task-comments-section">
          <h4>Yorumlar</h4>

          <div className="task-comments-list">
            {commentsLoading ? (
              <p className="task-comments-empty">Yorumlar yükleniyor...</p>
            ) : comments.length === 0 ? (
              <p className="task-comments-empty">
                Henüz yorum yok. İlk yorumu sen bırak.
              </p>
            ) : (
              comments.map((comment) => {
                const isCurrentUser = currentUser
                  ? comment.author.email.toLowerCase() ===
                    currentUser.authEmail.toLowerCase()
                  : false;
                const canDelete = isCurrentUser || isWorkspaceOwner;

                return (
                  <article key={comment.id} className="task-comment-item">
                    <div className="task-comment-meta">
                      <strong>
                        {isCurrentUser ? "Sen" : authorDisplayName(comment)}
                        {` (${comment.author.email})`}
                      </strong>
                      <span className="task-comment-time">
                        {formatCommentDate(comment.createdAt)}
                      </span>
                    </div>
                    <p>{comment.content}</p>
                    {canDelete ? (
                      <button
                        type="button"
                        className="comment-delete-btn"
                        title="Sil"
                        onClick={() => onDeleteComment(comment.id)}
                        aria-label="Yorumu sil"
                      >
                        <UiGlyph icon="trash" />
                      </button>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>

          <div className="task-comment-form">
            <textarea
              value={commentDraft}
              onChange={(event) => onCommentDraftChange(event.target.value)}
              placeholder="Bu görev hakkında bir yorum yaz..."
              maxLength={2000}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={onSubmitComment}
              disabled={commentSubmitting || !commentDraft.trim()}
            >
              {commentSubmitting ? "Gönderiliyor..." : "Yorum Ekle"}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Görevi sil"
        message={`"${task.title}" görevini silmek istediğinize emin misiniz?`}
        confirmLabel="Sil"
        cancelLabel="Vazgeç"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </aside>
  );
}
