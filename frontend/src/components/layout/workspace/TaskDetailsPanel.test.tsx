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
        onClose={() => {}}
        onCommentDraftChange={() => {}}
        onSubmitComment={() => {}}
        onSaveTaskDetails={onSaveTaskDetails}
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
        onClose={() => {}}
        onCommentDraftChange={() => {}}
        onSubmitComment={() => {}}
        onSaveTaskDetails={onSaveTaskDetails}
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
        onClose={() => {}}
        onCommentDraftChange={() => {}}
        onSubmitComment={() => {}}
        onSaveTaskDetails={onSaveTaskDetails}
      />,
    );

    const saveButton = screen.getByRole("button", {
      name: "Degisiklikleri Kaydet",
    });
    expect(saveButton).toBeDisabled();

    const titleInput = screen.getByLabelText("Görev metni");
    await user.clear(titleInput);
    await user.type(titleInput, "  Güncel görev başlığı  ");

    expect(saveButton).toBeEnabled();

    await user.click(saveButton);

    expect(onSaveTaskDetails).toHaveBeenCalledWith({
      title: "Güncel görev başlığı",
      status: "Yapılacak",
      priority: "Orta",
    });
  });
});
