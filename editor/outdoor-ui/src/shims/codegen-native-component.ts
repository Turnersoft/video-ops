import { View } from 'react-native';

type CodegenOptions = {
  interfaceOnly?: boolean;
};

/** Web stub for RN codegen native components (safe-area-context, etc.). */
export default function codegenNativeComponent(
  _name: string,
  _options?: CodegenOptions,
) {
  return View;
}
