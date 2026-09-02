import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TaskDetailsPanel from "./TaskDetailsPanel";
import type { Task } from "../../../types";

function buildTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 101,
    title: "İlk görev",
    vehicle: "Araç",
    customer: "Müşteri",
    area: "Saha",
    responsible: "Ali",
    description: "Açıklama",
    priority: "Orta",
    status: "Yapılacak",
    createdAt: "2026-08-07T10:00:00.000Z",
    workspaceId: "ws-1",
    ...overrides,
  };
}

describe("TaskDetailsPanel", () => {
  it("opens without crashing after being initially closed", () => {
    const onSaveTaskDetails = vi.fn().mockResolvedValue(undefined);

    const { rerender } = render(
      <TaskDetailsPanel
        open={false}
        task={null}
        currentUser={null}
        comments={[]}
        commentsLoading={false}
        commentDraft=""
        commentSubmitting={false}
        taskUpdating={false}
        isWorkspaceOwner
        members={[]}
        idToken={null}
        onClose={() => {}}
        onUnauthorized={() => {}}
        onCommentDraftChange={() => {}}
        onSubmitComment={() => {}}
        onDeleteComment={() => {}}
        onSaveTaskDetails={onSaveTaskDetails}
        onDeleteTask={() => {}}
      />,
    );

    expect(screen.queryByText("Görev Detayı")).not.toBeInTheDocument();

    rerender(
      <TaskDetailsPanel
        open
        task={buildTask()}
        currentUser={null}
        comments={[]}
        commentsLoading={false}
        commentDraft=""
        commentSubmitting={false}
        taskUpdating={false}
        isWorkspaceOwner
        members={[]}
        idToken={null}
        onClose={() => {}}
        onUnauthorized={() => {}}
        onCommentDraftChange={() => {}}
        onSubmitComment={() => {}}
        onDeleteComment={() => {}}
        onSaveTaskDetails={onSaveTaskDetails}
        onDeleteTask={() => {}}
      />,
    );

    expect(screen.getByText("Görev Detayı")).toBeInTheDocument();
  });

  it("enables save button on valid changes and submits trimmed payload", async () => {
    const user = userEvent.setup();
    const onSaveTaskDetails = vi.fn().mockResolvedValue(undefined);

    render(
      <TaskDetailsPanel
        open
        task={buildTask({ title: "Mevcut görev" })}
        currentUser={null}
        comments={[]}
        commentsLoading={false}
        commentDraft=""
        commentSubmitting={false}
        taskUpdating={false}
        isWorkspaceOwner
        members={[]}
        idToken={null}
        onClose={() => {}}
        onUnauthorized={() => {}}
        onCommentDraftChange={() => {}}
        onSubmitComment={() => {}}
        onDeleteComment={() => {}}
        onSaveTaskDetails={onSaveTaskDetails}
        onDeleteTask={() => {}}
      />,
    );

    const saveButton = screen.getByRole("button", {
      name: "Degisiklikleri Kaydet",
    });
    expect(saveButton).toBeDisabled();

    const titleInput = screen.getByLabelText("Görev metni");
    expect(titleInput.tagName).toBe("TEXTAREA");
    await user.clear(titleInput);
    await user.type(titleInput, "  Güncel görev başlığı  ");

    expect(saveButton).toBeEnabled();

    await user.click(saveButton);

    expect(onSaveTaskDetails).toHaveBeenCalledWith({
      title: "Güncel görev başlığı",
      status: "Yapılacak",
      priority: "Orta",
      remindAt: null,
      assigneeId: null,
    });
  });

  it("lets an assigned member only toggle the 'Bitirdim' flag", async () => {
    const user = userEvent.setup();
    const onSaveTaskDetails = vi.fn().mockResolvedValue(undefined);

    render(
      <TaskDetailsPanel
        open
        task={buildTask()}
        currentUser={null}
        comments={[]}
        commentsLoading={false}
        commentDraft=""
        commentSubmitting={false}
        taskUpdating={false}
        isWorkspaceOwner={false}
        members={[]}
        idToken={null}
        onClose={() => {}}
        onUnauthorized={() => {}}
        onCommentDraftChange={() => {}}
        onSubmitComment={() => {}}
        onDeleteComment={() => {}}
        onSaveTaskDetails={onSaveTaskDetails}
        onDeleteTask={() => {}}
      />,
    );

    // Üye durum rozetini düzenleyemez (buton değil, düz metin).
    expect(
      screen.queryByRole("button", { name: "Yapılacak" }),
    ).not.toBeInTheDocument();

    const saveButton = screen.getByRole("button", {
      name: "Degisiklikleri Kaydet",
    });
    expect(saveButton).toBeDisabled();

    await user.click(screen.getByRole("checkbox"));
    expect(saveButton).toBeEnabled();

    await user.click(saveButton);
    expect(onSaveTaskDetails).toHaveBeenCalledWith({ assigneeDone: true });
  });

  it("saves a reminder as an ISO timestamp", async () => {
    const user = userEvent.setup();
    const onSaveTaskDetails = vi.fn().mockResolvedValue(undefined);

    render(
      <TaskDetailsPanel
        open
        task={buildTask()}
        currentUser={null}
        comments={[]}
        commentsLoading={false}
        commentDraft=""
        commentSubmitting={false}
        taskUpdating={false}
        isWorkspaceOwner
        members={[]}
        idToken={null}
        onClose={() => {}}
        onUnauthorized={() => {}}
        onCommentDraftChange={() => {}}
        onSubmitComment={() => {}}
        onDeleteComment={() => {}}
        onSaveTaskDetails={onSaveTaskDetails}
        onDeleteTask={() => {}}
      />,
    );

    await user.type(
      screen.getByLabelText("Hatırlatıcı tarihi ve saati"),
      "2026-08-10T14:30",
    );
    await user.click(
      screen.getByRole("button", { name: "Degisiklikleri Kaydet" }),
    );

    expect(onSaveTaskDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        remindAt: new Date("2026-08-10T14:30").toISOString(),
      }),
    );
  });

  it("shows a 'Kaydedildi' acknowledgment after the parent updates the task prop post-save", async () => {
    const user = userEvent.setup();
    const initialTask = buildTask({ title: "Mevcut görev" });

    const onSaveTaskDetails = vi.fn().mockImplementation(async () => {
      rerender(
        <TaskDetailsPanel
          open
          task={{ ...initialTask, title: "Güncel görev başlığı" }}
          currentUser={null}
          comments={[]}
          commentsLoading={false}
          commentDraft=""
          commentSubmitting={false}
          taskUpdating={false}
          isWorkspaceOwner
          members={[]}
          idToken={null}
          onClose={() => {}}
          onUnauthorized={() => {}}
          onCommentDraftChange={() => {}}
          onSubmitComment={() => {}}
          onDeleteComment={() => {}}
          onSaveTaskDetails={onSaveTaskDetails}
          onDeleteTask={() => {}}
        />,
      );
    });

    const { rerender } = render(
      <TaskDetailsPanel
        open
        task={initialTask}
        currentUser={null}
        comments={[]}
        commentsLoading={false}
        commentDraft=""
        commentSubmitting={false}
        taskUpdating={false}
        isWorkspaceOwner
        members={[]}
        idToken={null}
        onClose={() => {}}
        onUnauthorized={() => {}}
        onCommentDraftChange={() => {}}
        onSubmitComment={() => {}}
        onDeleteComment={() => {}}
        onSaveTaskDetails={onSaveTaskDetails}
        onDeleteTask={() => {}}
      />,
    );

    const titleInput = screen.getByLabelText("Görev metni");
    await user.clear(titleInput);
    await user.type(titleInput, "Güncel görev başlığı");

    const saveButton = screen.getByRole("button", {
      name: "Degisiklikleri Kaydet",
    });
    await user.click(saveButton);

    expect(
      await screen.findByRole("button", { name: "✓ Kaydedildi" }),
    ).toBeInTheDocument();
  });
});
