import classes from "./AutoGrowTextInput.module.scss";
import { webModuleStyle, webClassName } from '../../utils/webClassName';
import type { AutoGrowTextInputProps } from "./AutoGrowTextInput.types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TextInput, type TextInputProps } from "react-native";

export type { AutoGrowTextInputProps } from "./AutoGrowTextInput.types";

function estimateHeight(
  text: string,
  lineHeight: number,
  minHeight: number,
  nowrap = false,
): number {
  const lines = Math.max(1, text.split("\n").length);
  if (nowrap) {
    return Math.max(minHeight, lines * lineHeight + 8);
  }
  const wrapped = Math.ceil(text.length / 72);
  return Math.max(minHeight, Math.max(lines, wrapped) * lineHeight + 8);
}

export function AutoGrowTextInput({
  value,
  onChangeText,
  lineHeight = 18,
  minLines = 2,
  maxLines,
  nowrap = false,
  fillHeight = false,
  inputStyle,
  inputClassName,
  style,
  onContentSizeChange,
  ...rest
}: AutoGrowTextInputProps) {
  const minHeight = minLines * lineHeight + 8;
  const maxHeight = maxLines != null ? maxLines * lineHeight + 8 : undefined;

  const [contentHeight, setContentHeight] = useState(() =>
    Math.max(minHeight, estimateHeight(value, lineHeight, minHeight, nowrap)),
  );

  useEffect(() => {
    if (fillHeight) {
      return;
    }
    setContentHeight((current) =>
      Math.max(current, minHeight, estimateHeight(value, lineHeight, minHeight, nowrap)),
    );
  }, [fillHeight, lineHeight, minHeight, nowrap, value]);

  const boxHeight = useMemo(() => {
    if (fillHeight) {
      return undefined;
    }
    const grown = Math.max(minHeight, contentHeight);
    return maxHeight != null ? Math.min(grown, maxHeight) : grown;
  }, [contentHeight, fillHeight, maxHeight, minHeight]);

  const scrollEnabled = fillHeight || (maxHeight != null && contentHeight > maxHeight);

  const handleContentSizeChange = useCallback<
    NonNullable<TextInputProps["onContentSizeChange"]>
  >(
    (event) => {
      if (!fillHeight) {
        setContentHeight(Math.max(minHeight, event.nativeEvent.contentSize.height));
      }
      onContentSizeChange?.(event);
    },
    [fillHeight, minHeight, onContentSizeChange],
  );

  return (
    <TextInput
      {...rest}
      value={value}
      onChangeText={onChangeText}
      multiline
      scrollEnabled={scrollEnabled}
      textAlignVertical="top"
      onContentSizeChange={handleContentSizeChange}
      style={[
        webModuleStyle(
          classes.root,
          classes.input,
          nowrap ? classes.nowrap : undefined,
          scrollEnabled ? classes.scrollCap : undefined,
          fillHeight ? classes.fillHeight : undefined,
          inputClassName,
        ),
        inputStyle,
        style,
        fillHeight
          ? { flex: 1, minHeight, alignSelf: "stretch" }
          : {
              height: boxHeight,
              minHeight,
              ...(maxHeight != null ? { maxHeight } : null),
            },
      ]}
    />
  );
}
