"use client";
import { useState } from "react";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import { mutate } from "@/frontend/api";

import { toast } from "sonner";

import type { Deletion } from "@/frontend/finance/types";
export default function DeleteDialog({ deletion, refresh, onClose }: { deletion: Deletion; refresh: () => Promise<void>; onClose: () => void }) {
const [saving, setSaving] = useState(false);
  async function remove() {
    if (!deletion || saving) return;
    setSaving(true);
    try {
      await mutate(
        deletion.kind,
        "DELETE",
        null,
        crypto.randomUUID(),
        deletion.id,
      );
      onClose();
      toast.success("Registro excluído.");
      await refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível excluir.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (<AlertDialog
    open
    onOpenChange={(open) => {
      if (!open && !saving) onClose();
    }}
  >
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Excluir este registro?</AlertDialogTitle>
        <AlertDialogDescription>
          “{deletion?.name}” será excluído permanentemente.{" "}
          {deletion?.kind === "transactions"
            ? "Se for uma compra parcelada, apenas esta parcela será excluída."
            : ""}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
        <AlertDialogAction
          disabled={saving}
          onClick={(event) => {
            event.preventDefault();
            void remove();
          }}
        >
          Excluir registro
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>);
}
