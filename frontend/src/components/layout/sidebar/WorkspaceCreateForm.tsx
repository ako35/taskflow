import React from "react";

type WorkspaceCreateFormProps = {
  value: string;
  onValueChange: (value: string) => void;
  onCreate: () => void;
  onCancel: () => void;
};

export default function WorkspaceCreateForm({
  value,
  onValueChange,
  onCreate,
  onCancel,
}: WorkspaceCreateFormProps) {
  return (
    <div className="workspace-create">
      <input
        type="text"
        value={value}
        placeholder="Alan adı"
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            onCreate();
          }
        }}
      />
      <button type="button" className="btn-secondary" onClick={onCreate}>
        Ekle
      </button>
      <button type="button" className="btn-secondary" onClick={onCancel}>
        İptal
      </button>
    </div>
  );
}
