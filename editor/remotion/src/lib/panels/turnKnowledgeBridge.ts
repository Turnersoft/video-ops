// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/bridge/turnKnowledgeBridge.ts
/**
 * Single import surface for VS Code extension knowledge/proof math rendering.
 * Used by AppPage side panels and Remotion video frames so pixels stay aligned.
 */
import './turnVideoPanelStyles';

export { GoalRow } from '@turn-user/language_server/vscode_extension/src/visualization/proof/ProofTimelineGoalRow';
export { DEFAULT_PROOF_PANEL_PHRASES } from '@turn-user/language_server/vscode_extension/src/visualization/proof/proofPanelPhrases';
export { renderMathNode } from '@turn-user/language_server/vscode_extension/src/visualization/knowledge/render/mathShell';
export type { RenderContext } from '@turn-user/language_server/vscode_extension/src/visualization/knowledge/render/context';
export type { ProofPanelGoal } from '@turn-user/language_server/vscode_extension/src/visualization/ast/types';
