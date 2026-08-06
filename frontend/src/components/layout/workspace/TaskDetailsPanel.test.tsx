import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TaskDetailsPanel from "./TaskDetailsPanel";
import type { Task } from "../../../types";

function buildTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 101,
    title: "Ilk gorev",
    vehicle: "Arac",
    customer: "Musteri",
    area: "Saha",
    responsible: "Ali",
    description: "Aciklama",
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
        task={buildTask({ title: "Mevcut gorev" })}
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

    const titleInput = screen.getByLabelText("Gorev Metni");
    await user.clear(titleInput);
    await user.type(titleInput, "  Guncel gorev basligi  ");

    expect(saveButton).toBeEnabled();

    await user.click(saveButton);

    expect(onSaveTaskDetails).toHaveBeenCalledWith({
      title: "Guncel gorev basligi",
      status: "Yapılacak",
      priority: "Orta",
    });
  });
});
