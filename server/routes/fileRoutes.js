const express = require('express');
const router = express.Router();
const { streamFromGridFS } = require('../utils/gridfs');

// Generic proxy for PDFs stored in MongoDB (GridFS) — used by evaluation
// subject/correction/submission files and exercise answers, which the client
// renders as plain <a href> links (no auth header attached), exactly like the
// direct Cloudinary links they replace. Not gated by req.user on purpose: same
// security posture as before (unguessable id, not access-controlled) — lesson
// and programme PDFs keep their own protected routes with real ownership/
// enrollment checks (see lessonController.streamPdf, courseController.
// downloadProgramme), which call streamFromGridFS directly instead of this.
router.get('/pdf/:id', async (req, res) => {
  await streamFromGridFS(res, req.params.id, 'application/pdf');
});

module.exports = router;
