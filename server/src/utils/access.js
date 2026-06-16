export const documentId = (value) => value?._id || value;

export const idsMatch = (left, right) => {
  const leftId = documentId(left);
  const rightId = documentId(right);
  return Boolean(leftId && rightId && leftId.toString() === rightId.toString());
};

export const canManage = (user) => ["admin", "staff"].includes(user.role);

export const canAccessClientResource = (user, resource) => {
  return canManage(user) || idsMatch(resource?.client, user._id);
};
