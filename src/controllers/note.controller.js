import { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Note } from "../models/note.model.js";

const getAllNotes = asyncHandler(async (req, res) => {
    const user = req.user;

    const notes = await Note.find({ userId: user._id }).sort({ isPinned: -1 });
    if (!notes) {
        throw new ApiError(500, "Notes not found!");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, notes, "All notes retrieved.")
        )
});

const addNote = asyncHandler(async (req, res) => {
    const { title, content, tags } = req.body;
    const user = req.user;

    if (!title) {
        throw new ApiError(400, "Title is required!");
    }
    if (!content) {
        throw new ApiError(400, "Content is required!");
    }

    const note = await Note.create({
        title,
        content,
        tags: tags || [],
        userId: user._id,
    });

    if (!note) {
        throw new ApiError(500, "Failed to create note!");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, note, "Note created."));
});

const editNote = asyncHandler(async (req, res) => {
    const noteId = req.params.noteId;
    const { title, content, tags, isPinned } = req.body;
    const user = req.user;

    if (!isValidObjectId(noteId)) {
        throw new ApiError(400, "Invalid Note-Id!");
    }

    if (!(title && content && tags)) {
        throw new ApiError(400, "No changes provided!")
    }

    const note = await Note.findOne({ _id: noteId, userId: user._id });
    if (!note) {
        throw new ApiError(400, "Note not found!");
    }

    if (title) note.title = title;
    if (content) note.content = content;
    if (tags) note.tags = tags;
    if (isPinned) note.isPinned = isPinned;

    const updatedNote = await note.save({ validateBeforeSave: false });
    if (!updatedNote) {
        throw new ApiError(500, "Failed to update note!");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedNote, "Note updated.")
        )
});

const updatePinStatus = asyncHandler(async (req, res) => {
    const noteId = req.params.noteId;
    const { isPinned } = req.body;
    const user = req.user;

    if (!isValidObjectId(noteId)) {
        throw new ApiError(400, "Invalid Note-Id!");
    }

    if (isPinned === null || isPinned === undefined) {
        throw new ApiError(400, "No changes provided!")
    }

    const note = await Note.findOne({ _id: noteId, userId: user._id });
    if (!note) {
        throw new ApiError(400, "Note not found!");
    }

    note.isPinned = isPinned;

    const updatedNote = await note.save({ validateBeforeSave: false });
    if (!updatedNote) {
        throw new ApiError(500, "Failed to update pin status!");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedNote, "Note pin status updated.")
        )
});

const searchNote = asyncHandler(async (req, res) => {
    const user = req.user;
    const { query } = req.query;

    if (!query) {
        throw new ApiError(400, "Search query is required!")
    }

    const matchingNotes = await Note.find({
        userId: user._id,
        $or: [
            { title: { $regex: new RegExp(query, "i") } },
            { content: { $regex: new RegExp(query, "i") } },
        ],
    });

    if(!matchingNotes) {
        throw new ApiError(500, "Error while retrieving notes!")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, matchingNotes, "Notes matching the search query retrieved.")
        );
});

const deleteNote = asyncHandler(async (req, res) => {
    const noteId = req.params.noteId;
    const user = req.user;

    const note = await Note.findOne({ _id: noteId, userId: user._id });
    if (!note) {
        throw new ApiError(400, "Note not found!");
    }

    await Note.deleteOne({ _id: noteId, userId: user._id });

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Note deleted.")
        )
});

export {
    getAllNotes,
    addNote,
    editNote,
    updatePinStatus,
    searchNote,
    deleteNote,
};