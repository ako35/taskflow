import React from "react";
import type { CariEntry, CariEntryForm } from "../../types";
import { UiGlyph } from "../ui/Icons";

type CariFormChangeHandler = (
  field: keyof CariEntryForm,
) => (
  event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
) => void;

type CariTableProps = {
  showForm: boolean;
  isWorkspaceOwner: boolean;
  loading: boolean;
  isFormValid: boolean;
  entries: CariEntry[];
  balance: number;
  form: CariEntryForm;
  onChangeForm: CariFormChangeHandler;
  onSubmit: () => void;
  onHideForm: () => void;
  onDeleteEntry: (entryId: number) => void;
  editingEntryId: number | null;
  editForm: CariEntryForm;
  editSubmitting: boolean;
  isEditFormValid: boolean;
  onStartEdit: (entry: CariEntry) => void;
  onCancelEdit: () => void;
  onEditChange: CariFormChangeHandler;
  onSaveEdit: () => void;
};

function formatAmount(amount: number) {
  return amount.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("tr-TR");
}

export default function CariTable({
  showForm,
  isWorkspaceOwner,
  loading,
  isFormValid,
  entries,
  balance,
  form,
  onChangeForm,
  onSubmit,
  onHideForm,
  onDeleteEntry,
  editingEntryId,
  editForm,
  editSubmitting,
  isEditFormValid,
  onStartEdit,
  onCancelEdit,
  onEditChange,
  onSaveEdit,
}: CariTableProps) {
  return (
    <div className="cari-table-wrapper">
      <table className="cari-table">
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Açıklama</th>
            <th>Tür</th>
            <th className="cari-amount-header">Tutar</th>
            {isWorkspaceOwner ? <th aria-hidden="true" /> : null}
          </tr>
          {showForm && isWorkspaceOwner ? (
            <tr className="cari-create-row">
              <td>
                <input
                  type="date"
                  aria-label="Tarih"
                  value={form.date}
                  onChange={onChangeForm("date")}
                />
              </td>
              <td>
                <input
                  type="text"
                  aria-label="Açıklama"
                  value={form.description}
                  placeholder="Açıklama"
                  onChange={onChangeForm("description")}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") onSubmit();
                    if (event.key === "Escape") onHideForm();
                  }}
                />
              </td>
              <td>
                <select
                  aria-label="Borç mu alacak mı"
                  value={form.type}
                  onChange={onChangeForm("type")}
                >
                  <option value="BORC">Borç</option>
                  <option value="ALACAK">Alacak</option>
                </select>
              </td>
              <td>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  aria-label="Tutar"
                  value={form.amount}
                  placeholder="0,00"
                  onChange={onChangeForm("amount")}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") onSubmit();
                    if (event.key === "Escape") onHideForm();
                  }}
                />
              </td>
              <td className="cari-create-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={onSubmit}
                  disabled={loading || !isFormValid}
                >
                  {loading ? "Ekleniyor..." : "Ekle"}
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Formu kapat"
                  title="Formu kapat"
                  onClick={onHideForm}
                >
                  <UiGlyph icon="close" />
                </button>
              </td>
            </tr>
          ) : null}
        </thead>
        <tbody>
          {loading && entries.length === 0 ? (
            <tr>
              <td colSpan={isWorkspaceOwner ? 5 : 4} className="no-data">
                Kayıtlar yükleniyor...
              </td>
            </tr>
          ) : entries.length === 0 ? (
            <tr>
              <td colSpan={isWorkspaceOwner ? 5 : 4} className="no-data">
                Bu alanda kayıtlı cari hareketi bulunmuyor.
              </td>
            </tr>
          ) : (
            entries.map((entry) =>
              isWorkspaceOwner && editingEntryId === entry.id ? (
                <tr key={entry.id} className="cari-create-row">
                  <td>
                    <input
                      type="date"
                      aria-label="Tarih"
                      value={editForm.date}
                      onChange={onEditChange("date")}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      aria-label="Açıklama"
                      value={editForm.description}
                      placeholder="Açıklama"
                      onChange={onEditChange("description")}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") onSaveEdit();
                        if (event.key === "Escape") onCancelEdit();
                      }}
                    />
                  </td>
                  <td>
                    <select
                      aria-label="Borç mu alacak mı"
                      value={editForm.type}
                      onChange={onEditChange("type")}
                    >
                      <option value="BORC">Borç</option>
                      <option value="ALACAK">Alacak</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      aria-label="Tutar"
                      value={editForm.amount}
                      placeholder="0,00"
                      onChange={onEditChange("amount")}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") onSaveEdit();
                        if (event.key === "Escape") onCancelEdit();
                      }}
                    />
                  </td>
                  <td className="cari-create-actions">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={onSaveEdit}
                      disabled={editSubmitting || !isEditFormValid}
                    >
                      {editSubmitting ? "Kaydediliyor..." : "Kaydet"}
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="Düzenlemeyi iptal et"
                      title="Düzenlemeyi iptal et"
                      onClick={onCancelEdit}
                    >
                      <UiGlyph icon="close" />
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={entry.id}>
                  <td className="cari-date-cell">{formatDate(entry.date)}</td>
                  <td className="cari-description-cell">
                    {entry.description || "-"}
                  </td>
                  <td>
                    <span
                      className={
                        entry.type === "BORC"
                          ? "cari-type-badge cari-type-borc"
                          : "cari-type-badge cari-type-alacak"
                      }
                    >
                      {entry.type === "BORC" ? "Borç" : "Alacak"}
                    </span>
                  </td>
                  <td
                    className={
                      entry.type === "BORC"
                        ? "cari-amount-cell cari-amount-negative"
                        : "cari-amount-cell cari-amount-positive"
                    }
                  >
                    {entry.type === "BORC" ? "-" : "+"}
                    {formatAmount(entry.amount)}
                  </td>
                  {isWorkspaceOwner ? (
                    <td className="cari-row-actions">
                      <button
                        type="button"
                        className="icon-button cari-edit-button"
                        aria-label="Kaydı düzenle"
                        title="Kaydı düzenle"
                        onClick={() => onStartEdit(entry)}
                      >
                        <UiGlyph icon="edit" />
                      </button>
                      <button
                        type="button"
                        className="icon-button cari-delete-button"
                        aria-label="Kaydı sil"
                        title="Kaydı sil"
                        onClick={() => onDeleteEntry(entry.id)}
                      >
                        <UiGlyph icon="trash" />
                      </button>
                    </td>
                  ) : null}
                </tr>
              ),
            )
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="cari-balance-label">
              Bakiye
            </td>
            <td
              className={
                balance < 0
                  ? "cari-amount-cell cari-amount-negative"
                  : "cari-amount-cell cari-amount-positive"
              }
            >
              {balance < 0 ? "-" : "+"}
              {formatAmount(Math.abs(balance))}
            </td>
            {isWorkspaceOwner ? <td /> : null}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
