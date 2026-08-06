import React from "react";
import { priorityClassNames, statusClassNames } from "../../../constants";
import type { Task, TaskComment, User } from "../../../types";
import { UiGlyph } from "../../ui/Icons";

type TaskDetailsPanelProps = {
  open: boolean;
  task: Task | null;
  currentUser: User | null;
  comments: TaskComment[];
  commentsLoading: boolean;
  commentDraft: string;
  commentSubmitting: boolean;
  onClose: () => void;
  onCommentDraftChange: (value: string) => void;
  onSubmitComment: () => void;
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

export default function TaskDetailsPanel({
  open,
  task,
  currentUser,
  comments,
  commentsLoading,
  commentDraft,
  commentSubmitting,
  onClose,
  onCommentDraftChange,
  onSubmitComment,
}: TaskDetailsPanelProps) {
  if (!open || !task) {
    return null;
  }

  return (
    <aside className="task-details-panel" aria-label="Gorev detay paneli">
      <div className="task-details-head">
        <h3>Gorev Detayi</h3>
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
        <div className="task-details-card">
          <h4>{task.title}</h4>

          <div className="task-details-badges">
            <span
              className={`task-badge task-status-badge ${
                statusClassNames[task.status ?? "Yapılacak"] ?? ""
              }`}
            >
              {task.status ?? "Yapılacak"}
            </span>
            <span
              className={`task-badge task-priority-badge ${
                priorityClassNames[task.priority] ?? ""
              }`}
            >
              {task.priority}
            </span>
          </div>

          <p className="task-details-description">
            {task.description?.trim() || "Bu gorev icin aciklama girilmemis."}
          </p>
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

                return (
                  <article key={comment.id} className="task-comment-item">
                    <div className="task-comment-meta">
                      <strong>
                        {isCurrentUser ? "Sen" : authorDisplayName(comment)}
                      </strong>
                      <span>{formatCommentDate(comment.createdAt)}</span>
                    </div>
                    <p>{comment.content}</p>
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
