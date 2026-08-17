/** Synthetic takes created by POST /api/scripts/:id/voxcpm-trial (no filmed source). */
export function isVoxcpmTake(takeId: string): boolean {
  return takeId.startsWith('take-voxcpm-');
}
