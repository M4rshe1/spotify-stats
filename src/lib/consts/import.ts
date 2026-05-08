export const importStatus = {
  pending: {
    label: "Pending",
    color: "warning",
  },
  processing: {
    label: "Processing",
    color: "info",
  },
  completed: {
    label: "Completed",
    color: "success",
  },
  failed: {
    label: "Failed",
    color: "destructive",
  },
} as const;

export type ImportStatusLabel = (typeof importStatus)[keyof typeof importStatus]["label"];
export type ImportStatusColor = (typeof importStatus)[keyof typeof importStatus]["color"];