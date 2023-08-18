import { getCache, clearCache } from '../../lib/cache';

export default (req, res) => {
  if (req.method !== "POST") {
    res.status(405).end(); // Method Not Allowed
    return;
  }

  clearCache('flowId');
  console.log("Flow ID after reset:", getCache('flowId'));
  res.json({ message: "Reset Flow ID Successfully." });
};