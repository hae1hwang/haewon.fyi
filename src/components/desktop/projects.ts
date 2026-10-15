// project windows are opened from the work folder's file list, so they have no
// fixed entry in the desktop's app table — their ids encode folder and title
const PREFIX = "project:";

export function projectWindowId(folder: string, title: string) {
  return `${PREFIX}${folder}/${title}`;
}

export function parseProjectWindowId(id: string) {
  if (!id.startsWith(PREFIX)) return null;
  const rest = id.slice(PREFIX.length);
  const slash = rest.indexOf("/");
  return { folder: rest.slice(0, slash), title: rest.slice(slash + 1) };
}
