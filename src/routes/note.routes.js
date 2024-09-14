import { Router } from "express";
import {
    getAllNotes,
    addNote,
    editNote,
    updatePinStatus,
    searchNote,
    deleteNote,
} from "../controllers/note.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

//secured routes
router.route("/get-all-notes").get(verifyJWT, getAllNotes);
router.route("/add-note").post(verifyJWT, addNote);
router.route("/edit-note/:noteId").patch(verifyJWT, editNote);
router.route("/update-pin/:noteId").patch(verifyJWT, updatePinStatus);
router.route("/search-notes/").get(verifyJWT, searchNote);
router.route("/delete-note/:noteId").delete(verifyJWT, deleteNote);

export default router;