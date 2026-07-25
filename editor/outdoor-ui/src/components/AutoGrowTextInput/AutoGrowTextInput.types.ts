import type { StyleProp, TextInputProps, TextStyle } from "react-native";

export type AutoGrowTextInputProps = TextInputProps & {
  value: string;
  onChangeText: (text: string) => void;
  lineHeight?: number;
  minLines?: number;
  /** Grow with content up to this line cap, then scroll inside the field. */
  maxLines?: number;
  /** Keep long lines on one row; scroll horizontally (web) instead of wrapping. */
  nowrap?: boolean;
  /** Fill the parent flex container height and scroll inside (web beat editor). */
  fillHeight?: boolean;
  inputStyle?: StyleProp<TextStyle>;
  /** Web SCSS module class for the input element. */
  inputClassName?: string;
};
