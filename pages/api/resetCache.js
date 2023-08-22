import { getCache, clearCache } from '../../lib/cache';

export default (req, res) => {
  if (req.method !== "POST") {
    res.status(405).end(); // Method Not Allowed
    return;
  }

  clearCache('organizationId');
  clearCache('templateId');
  clearCache('documentId');
  clearCache('flowId');
  clearCache('roleId');

  res.json({ message: "Cache Reset." });
};