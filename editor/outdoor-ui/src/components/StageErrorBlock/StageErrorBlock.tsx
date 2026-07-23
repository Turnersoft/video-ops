import classes from "./StageErrorBlock.module.scss";
import { webModuleStyle, webClassName } from '../../utils/webClassName';
import type { StageErrorBlockProps } from "./StageErrorBlock.types";
import { Text, View } from "react-native";

export function StageErrorBlock({ entry }: StageErrorBlockProps) {
  if (entry.status !== "failed" && entry.status !== "cancelled") {
    return null;
  }

  const title =
    entry.errorTitle ??
    (entry.status === "cancelled" ? "Aborted" : "Stage failed");
  const message = entry.error ?? entry.progress?.message ?? "Unknown error";
  const hint = entry.errorHint;

  return (
    <View style={webModuleStyle(classes.box)}>
      <Text style={webModuleStyle(classes.title)}>{title}</Text>
      <Text style={webModuleStyle(classes.message)}>{message}</Text>
      {hint ? <Text style={webModuleStyle(classes.hint)}>{hint}</Text> : null}
    </View>
  );
}
