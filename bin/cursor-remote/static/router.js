export function parseRoute(pathname = location.pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "w" && parts[1]) {
    const workspaceId = decodeURIComponent(parts[1]);
    if (parts[2] === "c" && parts[3]) {
      return {
        view: "thread",
        workspaceId,
        sessionId: decodeURIComponent(parts[3]),
      };
    }
    return { view: "chats", workspaceId };
  }
  return { view: "workspaces" };
}

export function routePath(workspaceId, sessionId) {
  if (workspaceId && sessionId) {
    return `/w/${encodeURIComponent(workspaceId)}/c/${encodeURIComponent(sessionId)}`;
  }
  if (workspaceId) {
    return `/w/${encodeURIComponent(workspaceId)}`;
  }
  return "/";
}

export function navigateTo(workspaceId, sessionId, { replace = false } = {}) {
  const path = routePath(workspaceId, sessionId);
  if (location.pathname === path) return;
  if (replace) {
    history.replaceState({ workspaceId, sessionId }, "", path);
  } else {
    history.pushState({ workspaceId, sessionId }, "", path);
  }
}
