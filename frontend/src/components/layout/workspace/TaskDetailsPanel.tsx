import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Task, TaskComment, User } from "../../../types";
import { UiGlyph } from "../../ui/Icons";
import { priorityClassNames, statusClassNames } from "../../../constants";
import InlineSelectMenu from "../../tasks/InlineSelectMenu";

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
  onClose: () => void;
  onCommentDraftChange: (value: string) => void;
  onSubmitComment: () => void;
  onDeleteComment: (commentId: number) => void;
  onSaveTaskDetails: (payload: {
    title: string;
    status: string;
    priority: string;
  }) => Promise<void>;
};

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
    return "Olusturma tarihi bilinmiyor";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Olusturma tarihi bilinmiyor";
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
  onClose,
  onCommentDraftChange,
  onSubmitComment,
  onDeleteComment,
  onSaveTaskDetails,
}: TaskDetailsPanelProps) {
  const [draftTitle, setDraftTitle] = useState("");
  const [draftStatus, setDraftStatus] = useState("Yapılacak");
  const [draftPriority, setDraftPriority] = useState("Orta");
  const [editingField, setEditingField] = useState<
    "status" | "priority" | null
  >(null);
  const [saveAcknowledged, setSaveAcknowledged] = useState(false);
  const saveAckTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!task) {
      return;
    }

    setDraftTitle(task.title || "");
    setDraftStatus(task.status ?? "Yapılacak");
    setDraftPriority(task.priority || "Orta");
    setSaveAcknowledged(false);
  }, [task]);

  useEffect(() => {
    return () => {
      if (saveAckTimerRef.current !== null) {
        window.clearTimeout(saveAckTimerRef.current);
      }
    };
  }, []);

  const canSaveTaskDetails = useMemo(() => {
    if (!task) {
      return false;
    }

    const nextTitle = draftTitle.trim();
    const baseTitle = task.title.trim();
    const baseStatus = task.status ?? "Yapılacak";
    const basePriority = task.priority || "Orta";

    const hasChanges =
      nextTitle !== baseTitle ||
      draftStatus !== baseStatus ||
      draftPriority !== basePriority;

    return Boolean(nextTitle) && hasChanges && !taskUpdating;
  }, [draftPriority, draftStatus, draftTitle, task, taskUpdating]);

  if (!open || !task) {
    return null;
  }

  const saveButtonLabel = taskUpdating
    ? "Kaydediliyor..."
    : saveAcknowledged && !canSaveTaskDetails
      ? "✓ Kaydedildi"
      : "Degisiklikleri Kaydet";

  const handleSaveDetails = async () => {
    await onSaveTaskDetails({
      title: draftTitle.trim(),
      status: draftStatus,
      priority: draftPriority,
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
        <button
          type="button"
          className="task-details-close"
          onClick={onClose}
          aria-label="Detay panelini kapat"
        >
          <UiGlyph icon="close" />
        </button>
      </div>

      <div className="task-details-body">
        <div className="task-details-card task-details-edit-section">
          <h4>Gorevi Duzenle</h4>

          <label className="task-details-field">
            <span>Gorev Metni</span>
            <input
              type="text"
              className="task-details-title-input"
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              placeholder="Gorev adini yazin"
              aria-label="Gorev metni"
            />
          </label>

          <p className="task-details-created-at">
            Olusturma Tarihi: {formatTaskCreatedAt(task.createdAt)}
          </p>

          <div className="task-details-field">
            <span>Durum</span>
            {editingField === "status" ? (
              <InlineSelectMenu
                value={draftStatus}
                fallbackValue="Yapılacak"
                options={["Yapılacak", "Tamamlandı"]}
                getOptionClassName={(opt) => statusClassNames[opt] ?? ""}
                badgeClassName="task-status-badge"
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
            <span>Onem</span>
            {editingField === "priority" ? (
              <InlineSelectMenu
                value={draftPriority}
                fallbackValue="Orta"
                options={["Acil", "Yüksek", "Orta", "Düşük"]}
                getOptionClassName={(opt) => priorityClassNames[opt] ?? ""}
                badgeClassName="task-priority-badge"
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

        <div className="task-comments-section">
          <h4>Yorumlar</h4>

          <div className="task-comments-list">
            {commentsLoading ? (
              <p className="task-comments-empty">Yorumlar yukleniyor...</p>
            ) : comments.length === 0 ? (
              <p className="task-comments-empty">
                Henuz yorum yok. Ilk yorumu sen birak.
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
              placeholder="Bu gorev hakkinda bir yorum yaz..."
              maxLength={2000}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={onSubmitComment}
              disabled={commentSubmitting || !commentDraft.trim()}
            >
              {commentSubmitting ? "Gonderiliyor..." : "Yorum Ekle"}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
